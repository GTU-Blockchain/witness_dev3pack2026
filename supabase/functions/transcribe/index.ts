// Edge Function: transcribe  (owner: Backend + captain)
// Contract: docs/TECHNICAL.md → "Supabase" → Edge Functions
//
// Input:  POST multipart/form-data  →  audio_hash (text) + file (the sealed m4a, unencrypted)
// Output: 200 { status: "done", transcript, transcript_lang }
//         200 { status: "already_done", ... } (if already done, ElevenLabs is not called again)
//
// To protect ElevenLabs credits it first checks that:
//   1. The recording was `register`ed (there is a row in recordings)
//   2. The SHA-256 of the uploaded file = audio_hash (no arbitrary audio can be sent)
//   3. There is no transcript yet
//   4. The file is audio or video (photos, documents etc. never go to ElevenLabs → 415, row 'skipped')
// Then it sends the file to ElevenLabs Scribe, maps the language code to the table's values (tur → tr, eng → en)
// and updates the row. On error, transcript_status = 'failed' (the app may retry).

import { createClient } from "npm:@supabase/supabase-js@2";

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ELEVENLABS_MODEL = "scribe_v1";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // ~25 MB; demo recordings are much smaller
const ELEVENLABS_TIMEOUT_MS = 60_000;

const HEX64 = /^[0-9a-f]{64}$/;

function isAudioOrVideo(mime: string): boolean {
  return mime.startsWith("audio/") || mime.startsWith("video/");
}

// Detects known non-audio types from the file's first bytes, without trusting the type the app sent.
// (m4a/mp4 also start with "ftyp", so for ftyp the brand is checked: heic/avif = image.)
function sniffNonAudio(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "%PDF") return "application/pdf";
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "application/zip";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "mif1", "msf1"].includes(brand)) return "image/heic";
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

// ElevenLabs returns ISO 639-3 ("tur"); the table only accepts 'tr' / 'en' (check constraint).
const LANG_MAP: Record<string, string> = { tur: "tr", tr: "tr", eng: "en", en: "en" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function fail(status: number, error: string, message: string): Response {
  return json(status, { error, message });
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "POST only");

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return fail(500, "not_configured", "ELEVENLABS_API_KEY is not set");

  // --- 0. Input ---
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "bad_form", "Body must be multipart/form-data (audio_hash + file)");
  }
  const audioHash = String(form.get("audio_hash") ?? "").toLowerCase();
  const file = form.get("file");
  if (!HEX64.test(audioHash)) return fail(400, "bad_audio_hash", "audio_hash must be 64 hex characters");
  if (!(file instanceof File) || file.size === 0) return fail(400, "missing_file", "No audio file in the file field");
  if (file.size > MAX_FILE_BYTES) return fail(413, "file_too_large", "File is larger than 25 MB");

  // --- 1. Is the file really this recording? ---
  const bytes = await file.arrayBuffer();
  if ((await sha256Hex(bytes)) !== audioHash) {
    return fail(400, "hash_mismatch", "The file's SHA-256 does not match audio_hash");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- 2. Is the recording registered, and is there a transcript already? ---
  const { data: row, error: selectError } = await supabase
    .from("recordings")
    .select("audio_hash, transcript, transcript_lang, transcript_status, mime_type")
    .eq("audio_hash", audioHash)
    .maybeSingle();
  if (selectError) return fail(500, "db_error", selectError.message);
  if (!row) return fail(404, "not_registered", "This hash is not registered; call register first");
  if (row.transcript_status === "done") {
    return json(200, {
      status: "already_done",
      transcript: row.transcript,
      transcript_lang: row.transcript_lang,
    });
  }

  // --- 2b. Audio/video? First the stored type, else the uploaded file's type, last the first bytes ---
  const declared = row.mime_type ?? (file.type ? file.type.split(";")[0].trim().toLowerCase() : "");
  const declaredNonAudio = declared !== "" && declared !== "application/octet-stream" && !isAudioOrVideo(declared);
  const sniffed = sniffNonAudio(new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength)));
  if (row.transcript_status === "skipped" || declaredNonAudio || sniffed) {
    if (row.transcript_status !== "skipped") {
      await supabase.from("recordings").update({ transcript_status: "skipped" }).eq("audio_hash", audioHash);
    }
    return fail(415, "unsupported_type", `Transcripts are only made for audio/video (file: ${sniffed ?? (declared || "unknown")})`);
  }

  const markFailed = () =>
    supabase.from("recordings").update({ transcript_status: "failed" }).eq("audio_hash", audioHash);

  // --- 3. ElevenLabs Scribe ---
  const upstream = new FormData();
  upstream.append("model_id", ELEVENLABS_MODEL);
  // Don't transcribe noise as tags like "[speech sounds]"; a silent/noisy recording gets an empty text.
  upstream.append("tag_audio_events", "false");
  upstream.append("file", new Blob([bytes], { type: file.type || "audio/mp4" }), file.name || "recording.m4a");

  let result: { text?: string; language_code?: string };
  try {
    const res = await fetch(ELEVENLABS_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstream,
      signal: AbortSignal.timeout(ELEVENLABS_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("elevenlabs error", res.status, (await res.text()).slice(0, 300));
      await markFailed();
      return fail(502, "transcription_failed", `ElevenLabs returned an error (HTTP ${res.status})`);
    }
    result = await res.json();
  } catch (e) {
    console.error("elevenlabs request failed", e);
    await markFailed();
    return fail(502, "transcription_failed", "Could not reach ElevenLabs, or it timed out");
  }

  const detectedLang = (result.language_code ?? "").toLowerCase();
  const transcriptLang = LANG_MAP[detectedLang] ?? null;
  // Witness supports only Turkish and English. Any other detected language is almost always misread noise
  // (a silent emulator recording came back as Hindi "[unclear sound]"); leave it empty rather than show nonsense.
  const transcript = transcriptLang ? (result.text ?? "").trim() : "";
  if (!transcriptLang) console.warn("unsupported transcript language, dropped", detectedLang || "(none)");

  // --- 4. Write the result ---
  const { error: updateError } = await supabase
    .from("recordings")
    .update({ transcript, transcript_lang: transcriptLang, transcript_status: "done" })
    .eq("audio_hash", audioHash);
  if (updateError) {
    console.error("db update failed", updateError);
    await markFailed();
    return fail(500, "db_error", updateError.message);
  }

  return json(200, { status: "done", transcript, transcript_lang: transcriptLang });
});

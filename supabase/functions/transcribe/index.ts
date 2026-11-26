// Edge Function: transcribe  (sahibi: 5 Backend + kaptan)
// Sözleşme: docs/TEKNIK_DOKUMAN.md → "Supabase" → Edge Function'lar, "Transkript akışı"
//
// Girdi:  POST multipart/form-data  →  audio_hash (metin) + file (mühürlenen m4a, şifresiz)
// Çıktı:  200 { status: "done", transcript, transcript_lang }
//         200 { status: "already_done", ... } (daha önce yapıldıysa ElevenLabs'e tekrar gitmez)
//
// ElevenLabs kredisini korumak için önce kontrol eder:
//   1. Kayıt `register` edilmiş (recordings'te satır var)
//   2. Gönderilen dosyanın SHA-256'sı = audio_hash (rastgele ses gönderilemez)
//   3. Transkript daha önce yapılmamış
//   4. Dosya ses ya da video (foto, belge vs. ElevenLabs'e hiç gönderilmez → 415, satır 'skipped')
// Sonra ElevenLabs Scribe'a gönderir, dil kodunu tabloya uygun hale getirir (tur → tr, eng → en),
// satırı günceller. Hata olursa transcript_status = 'failed' (uygulama tekrar deneyebilir).

import { createClient } from "npm:@supabase/supabase-js@2";

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ELEVENLABS_MODEL = "scribe_v1";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // ~25 MB; demo kayıtları çok daha küçük
const ELEVENLABS_TIMEOUT_MS = 60_000;

const HEX64 = /^[0-9a-f]{64}$/;

function isAudioOrVideo(mime: string): boolean {
  return mime.startsWith("audio/") || mime.startsWith("video/");
}

// Uygulamanın gönderdiği türe güvenmeden, dosyanın ilk baytlarından bilinen ses-dışı türleri tanır.
// (m4a/mp4 de "ftyp" ile başlar; o yüzden ftyp'te marka bakılır: heic/avif = resim.)
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

// ElevenLabs ISO 639-3 döner ("tur"); tablo sadece 'tr' / 'en' kabul ediyor (check constraint).
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
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Sadece POST");

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return fail(500, "not_configured", "ELEVENLABS_API_KEY tanımlı değil");

  // --- 0. Girdi ---
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "bad_form", "Gövde multipart/form-data olmalı (audio_hash + file)");
  }
  const audioHash = String(form.get("audio_hash") ?? "").toLowerCase();
  const file = form.get("file");
  if (!HEX64.test(audioHash)) return fail(400, "bad_audio_hash", "audio_hash 64 karakter hex olmalı");
  if (!(file instanceof File) || file.size === 0) return fail(400, "missing_file", "file alanında ses dosyası yok");
  if (file.size > MAX_FILE_BYTES) return fail(413, "file_too_large", "Dosya 25 MB'tan büyük");

  // --- 1. Dosya gerçekten bu kayıt mı? ---
  const bytes = await file.arrayBuffer();
  if ((await sha256Hex(bytes)) !== audioHash) {
    return fail(400, "hash_mismatch", "Dosyanın SHA-256'sı audio_hash ile aynı değil");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- 2. Kayıt register edilmiş mi, transkript zaten var mı? ---
  const { data: row, error: selectError } = await supabase
    .from("recordings")
    .select("audio_hash, transcript, transcript_lang, transcript_status, mime_type")
    .eq("audio_hash", audioHash)
    .maybeSingle();
  if (selectError) return fail(500, "db_error", selectError.message);
  if (!row) return fail(404, "not_registered", "Bu hash register edilmemiş; önce register çağrılmalı");
  if (row.transcript_status === "done") {
    return json(200, {
      status: "already_done",
      transcript: row.transcript,
      transcript_lang: row.transcript_lang,
    });
  }

  // --- 2b. Ses/video mu? Önce kayıttaki tür, yoksa gönderilen dosyanın türü, en son ilk baytlar ---
  const declared = row.mime_type ?? (file.type ? file.type.split(";")[0].trim().toLowerCase() : "");
  const declaredNonAudio = declared !== "" && declared !== "application/octet-stream" && !isAudioOrVideo(declared);
  const sniffed = sniffNonAudio(new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength)));
  if (row.transcript_status === "skipped" || declaredNonAudio || sniffed) {
    if (row.transcript_status !== "skipped") {
      await supabase.from("recordings").update({ transcript_status: "skipped" }).eq("audio_hash", audioHash);
    }
    return fail(415, "unsupported_type", `Transkript sadece ses/video için yapılır (dosya: ${sniffed ?? (declared || "bilinmiyor")})`);
  }

  const markFailed = () =>
    supabase.from("recordings").update({ transcript_status: "failed" }).eq("audio_hash", audioHash);

  // --- 3. ElevenLabs Scribe ---
  const upstream = new FormData();
  upstream.append("model_id", ELEVENLABS_MODEL);
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
      return fail(502, "transcription_failed", `ElevenLabs hata döndü (HTTP ${res.status})`);
    }
    result = await res.json();
  } catch (e) {
    console.error("elevenlabs request failed", e);
    await markFailed();
    return fail(502, "transcription_failed", "ElevenLabs'e ulaşılamadı ya da zaman aşımı");
  }

  const transcript = (result.text ?? "").trim();
  const transcriptLang = LANG_MAP[(result.language_code ?? "").toLowerCase()] ?? null;

  // --- 4. Sonucu yaz ---
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

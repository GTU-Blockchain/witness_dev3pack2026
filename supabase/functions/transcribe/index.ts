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
// Sonra ElevenLabs Scribe'a gönderir, dil kodunu tabloya uygun hale getirir (tur → tr, eng → en),
// satırı günceller. Hata olursa transcript_status = 'failed' (uygulama tekrar deneyebilir).

import { createClient } from "npm:@supabase/supabase-js@2";

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ELEVENLABS_MODEL = "scribe_v1";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // ~25 MB; demo kayıtları çok daha küçük
const ELEVENLABS_TIMEOUT_MS = 60_000;

const HEX64 = /^[0-9a-f]{64}$/;

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
    .select("audio_hash, transcript, transcript_lang, transcript_status")
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

// Edge Function: upload-url  (sahibi: 5 Backend + kaptan)
// Sözleşme: docs/TEKNIK_DOKUMAN.md → "Supabase" → Storage / Edge Function'lar, "Paylaşım için uçtan uca şifreleme"
//
// Girdi:  POST { audio_hash }
// Çıktı:  200 { path, token, expires_in }
//
// Kullanıcı "Paylaş" dediğinde uygulama dosyayı telefonda AES-256-GCM ile şifreler, bu fonksiyondan
// tek seferlik bir yükleme izni alır ve şifreli dosyayı `<audio_hash>.m4a.enc` yoluna yükler:
//   supabase.storage.from("recordings").uploadToSignedUrl(path, token, encryptedBytes)
//
// Kontroller:
//   1. Kayıt register edilmiş (zincirde doğrulanmış bir satır var)
//   2. Bu kayıt için henüz dosya yüklenmemiş. Yüklenen dosyanın üzerine yazılamaz (upsert yok).
// Sunucu dosyanın içeriğini doğrulayamaz (şifreli, anahtar sadece #k= kısmında). Bütünlüğü doğrulama
// sayfası sağlar: çözer, hash'ler, zincirle karşılaştırır. Yanlış dosya yüklenirse sonuç ❌ olur.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "recordings";
const HEX64 = /^[0-9a-f]{64}$/;
const SIGNED_UPLOAD_TTL_SECONDS = 2 * 60 * 60; // Supabase imzalı yükleme linkleri 2 saat geçerli

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Sadece POST");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json", "Gövde JSON olmalı");
  }
  const audioHash = String(body?.audio_hash ?? "").toLowerCase();
  if (!HEX64.test(audioHash)) return fail(400, "bad_audio_hash", "audio_hash 64 karakter hex olmalı");

  const path = `${audioHash}.m4a.enc`;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- 1. Kayıt register edilmiş mi? ---
  const { data: row, error: selectError } = await supabase
    .from("recordings")
    .select("audio_hash")
    .eq("audio_hash", audioHash)
    .maybeSingle();
  if (selectError) return fail(500, "db_error", selectError.message);
  if (!row) return fail(404, "not_registered", "Bu hash register edilmemiş; önce register çağrılmalı");

  // --- 2. Dosya zaten yüklenmiş mi? ---
  const { data: existing, error: listError } = await supabase.storage
    .from(BUCKET)
    .list("", { search: path, limit: 1 });
  if (listError) return fail(500, "storage_error", listError.message);
  if (existing?.some((o) => o.name === path)) {
    return fail(409, "already_uploaded", "Bu kayıt için dosya zaten yüklenmiş; üzerine yazılamaz");
  }

  // --- 3. Tek seferlik yükleme izni ---
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !signed) return fail(500, "storage_error", signError?.message ?? "İmzalı link oluşturulamadı");

  // Paylaşım beklenen yolu satıra yaz (doğrulama sayfası buradan bulur)
  const { error: updateError } = await supabase
    .from("recordings")
    .update({ storage_path: path, is_encrypted: true })
    .eq("audio_hash", audioHash);
  if (updateError) return fail(500, "db_error", updateError.message);

  return json(200, { path: signed.path, token: signed.token, expires_in: SIGNED_UPLOAD_TTL_SECONDS });
});

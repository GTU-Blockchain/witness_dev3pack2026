// Edge Function: upload-url  (sahibi: 5 Backend + kaptan)
// Sözleşme: docs/TEKNIK_DOKUMAN.md → "Supabase" → Storage / Edge Function'lar, "Paylaşım için uçtan uca şifreleme"
//
// Girdi:  POST { audio_hash, signature }
//         signature: kaydı register eden cüzdanın `witness-upload:<audio_hash>` mesajına attığı ed25519 imzası
//         (MWA `signMessages`). base64 ya da base58; 64 baytlık imza ya da imzayı içeren signed payload olabilir.
// Çıktı:  200 { path, token, expires_in }
//
// Kullanıcı "Paylaş" dediğinde uygulama dosyayı telefonda AES-256-GCM ile şifreler, bu fonksiyondan
// tek seferlik bir yükleme izni alır ve şifreli dosyayı `<audio_hash>.m4a.enc` yoluna yükler:
//   supabase.storage.from("recordings").uploadToSignedUrl(path, token, encryptedBytes)
//
// Kontroller:
//   1. Kayıt register edilmiş (zincirde doğrulanmış bir satır var)
//   2. İsteği kaydın sahibi yapıyor (imza, satırdaki cüzdanla doğrulanır). Böylece başkası, sahibinden önce
//      kayda çöp dosya yükleyip paylaşımı kilitleyemez.
//   3. Bu kayıt için henüz dosya yüklenmemiş. Yüklenen dosyanın üzerine yazılamaz (upsert yok).
// Sunucu dosyanın içeriğini doğrulayamaz (şifreli, anahtar sadece #k= kısmında). Bütünlüğü doğrulama
// sayfası sağlar: çözer, hash'ler, zincirle karşılaştırır. Yanlış dosya yüklenirse sonuç ❌ olur.

import { PublicKey } from "npm:@solana/web3.js@1.98.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import bs58 from "npm:bs58@6.0.0";
import nacl from "npm:tweetnacl@1.0.3";

const BUCKET = "recordings";
const HEX64 = /^[0-9a-f]{64}$/;
const SIGNED_UPLOAD_TTL_SECONDS = 2 * 60 * 60; // Supabase imzalı yükleme linkleri 2 saat geçerli

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const signMessageFor = (audioHash: string) => new TextEncoder().encode(`witness-upload:${audioHash}`);

function decodeBase64(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function decodeBase58(s: string): Uint8Array | null {
  try {
    return bs58.decode(s);
  } catch {
    return null;
  }
}

// Cüzdanlar imzayı farklı biçimlerde döndürebiliyor: sadece 64 bayt imza, ya da mesaj + imza
// (imza başta veya sonda). Her olası 64 baytlık adayı dener.
function verifyOwnerSignature(signature: string, message: Uint8Array, wallet: Uint8Array): boolean {
  for (const bytes of [decodeBase64(signature), decodeBase58(signature)]) {
    if (!bytes) continue;
    const candidates = bytes.length === 64
      ? [bytes]
      : bytes.length === 64 + message.length
      ? [bytes.slice(0, 64), bytes.slice(message.length)]
      : [];
    for (const sig of candidates) {
      if (nacl.sign.detached.verify(message, sig, wallet)) return true;
    }
  }
  return false;
}

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

  const signature = String(body?.signature ?? "").trim();
  if (signature === "" || signature.length > 512) {
    return fail(400, "bad_signature", "signature gerekli: cüzdanın `witness-upload:<audio_hash>` mesajına imzası");
  }

  const path = `${audioHash}.m4a.enc`;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- 1. Kayıt register edilmiş mi? ---
  const { data: row, error: selectError } = await supabase
    .from("recordings")
    .select("audio_hash, wallet")
    .eq("audio_hash", audioHash)
    .maybeSingle();
  if (selectError) return fail(500, "db_error", selectError.message);
  if (!row) return fail(404, "not_registered", "Bu hash register edilmemiş; önce register çağrılmalı");

  // --- 2. İsteği kaydın sahibi mi yapıyor? ---
  let walletBytes: Uint8Array;
  try {
    walletBytes = new PublicKey(row.wallet).toBytes();
  } catch {
    return fail(500, "db_error", "Kayıttaki cüzdan adresi okunamadı");
  }
  if (!verifyOwnerSignature(signature, signMessageFor(audioHash), walletBytes)) {
    return fail(403, "not_owner", "İmza bu kaydı register eden cüzdana ait değil");
  }

  // --- 3. Dosya zaten yüklenmiş mi? ---
  const { data: existing, error: listError } = await supabase.storage
    .from(BUCKET)
    .list("", { search: path, limit: 1 });
  if (listError) return fail(500, "storage_error", listError.message);
  if (existing?.some((o) => o.name === path)) {
    return fail(409, "already_uploaded", "Bu kayıt için dosya zaten yüklenmiş; üzerine yazılamaz");
  }

  // --- 4. Tek seferlik yükleme izni ---
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

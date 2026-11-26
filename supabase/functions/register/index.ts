// Edge Function: register  (sahibi: 5 Backend + kaptan)
// Sözleşme: docs/TEKNIK_DOKUMAN.md → "Supabase" → Edge Function'lar
//
// Girdi:  POST { audio_hash, tx_signature, wallet }
// Çıktı:  201 { status: "registered", recording }  ya da  200 { status: "already_registered", recording }
//
// Gelen hiçbir değere güvenmez. Satırı yazmadan önce zincirden şunları doğrular:
//   1. İşlem devnet'te var, onaylı ve başarılı
//   2. `wallet` işlemi imzalamış
//   3. İşlem Witness programının register_recording'ini çağırıyor, içindeki hash = audio_hash
//   4. Çağrıdaki hesaplar: PDA = ["rec", hash] ve authority = wallet
//   5. PDA zincirde var, programa ait, içindeki authority ve audio_hash eşleşiyor
// Sonra satırı service role ile yazar (RLS'yi atlar). Aynı kayıt tekrar gelirse mevcut satırı döner.

import { Connection, PublicKey } from "npm:@solana/web3.js@1.98.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const PROGRAM_ID = new PublicKey(
  Deno.env.get("WITNESS_PROGRAM_ID") ?? "2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ",
);
const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";

// program/target/idl/witness.json'dan
const REGISTER_IX_DISCRIMINATOR = [134, 1, 57, 133, 241, 98, 215, 15];
const RECORDING_ACCOUNT_DISCRIMINATOR = [127, 40, 57, 149, 55, 75, 215, 111];

const HEX64 = /^[0-9a-f]{64}$/;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Base58 metni bayta çevirir; geçersiz karakter varsa null. Solana imzası tam 64 bayt olmalı.
function base58ByteLength(s: string): number | null {
  if (s.length === 0 || s.length > 100) return null;
  let n = 0n;
  for (const c of s) {
    const v = BASE58_ALPHABET.indexOf(c);
    if (v < 0) return null;
    n = n * 58n + BigInt(v);
  }
  let bytes = 0;
  while (n > 0n) {
    n >>= 8n;
    bytes++;
  }
  const leadingZeros = s.length - s.replace(/^1+/, "").length;
  return bytes + leadingZeros;
}

function startsWith(data: Uint8Array, prefix: number[]): boolean {
  return data.length >= prefix.length && prefix.every((b, i) => data[i] === b);
}

type Recording = {
  authority: PublicKey;
  audioHash: string;
  recordedAt: number;
  anchoredAt: number;
  durationMs: number;
  hasLocation: boolean;
};

// Recording hesabını Borsh düzenine göre çözer:
// 8 discriminator | 32 authority | 32 audio_hash | 8 recorded_at | 8 anchored_at | 4 duration_ms
// | Option<[u8;32]> location_commitment | 1 bump
// Dikkat: Option boşsa (None) 1 bayt, doluysa (Some) 1 + 32 bayt yer kaplar; sonraki alanların yeri buna göre kayar.
function decodeRecording(data: Uint8Array): Recording | null {
  const minLen = 8 + 32 + 32 + 8 + 8 + 4 + 1 + 1;
  if (data.length < minLen || !startsWith(data, RECORDING_ACCOUNT_DISCRIMINATOR)) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 8;
  const authority = new PublicKey(data.slice(o, o + 32));
  o += 32;
  const audioHash = toHex(data.slice(o, o + 32));
  o += 32;
  const recordedAt = Number(view.getBigInt64(o, true));
  o += 8;
  const anchoredAt = Number(view.getBigInt64(o, true));
  o += 8;
  const durationMs = view.getUint32(o, true);
  o += 4;
  const optionTag = data[o];
  if (optionTag !== 0 && optionTag !== 1) return null;

  return { authority, audioHash, recordedAt, anchoredAt, durationMs, hasLocation: optionTag === 1 };
}

// Uygulama bizi confirmTransaction'dan hemen sonra çağırır; RPC bazen bir an geç görür, birkaç kez dene.
async function getTransactionWithRetry(conn: Connection, signature: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const tx = await conn.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx) return tx;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Sadece POST");

  // --- 0. Girdi biçimi ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json", "Gövde JSON olmalı");
  }
  const audioHash = String(body?.audio_hash ?? "").toLowerCase();
  const txSignature = String(body?.tx_signature ?? "");
  const walletInput = String(body?.wallet ?? "");

  if (!HEX64.test(audioHash)) return fail(400, "bad_audio_hash", "audio_hash 64 karakter hex olmalı");
  if (base58ByteLength(txSignature) !== 64) {
    return fail(400, "bad_tx_signature", "tx_signature geçerli bir Solana imzası değil (64 bayt base58)");
  }
  let wallet: PublicKey;
  try {
    wallet = new PublicKey(walletInput);
  } catch {
    return fail(400, "bad_wallet", "wallet geçerli bir Solana adresi değil");
  }

  const conn = new Connection(RPC_URL, "confirmed");
  const pda = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("rec"), hexToBytes(audioHash)],
    PROGRAM_ID,
  )[0];

  try {
    // --- 1. İşlem var, onaylı, başarılı ---
    const tx = await getTransactionWithRetry(conn, txSignature);
    if (!tx) return fail(404, "tx_not_found", "İşlem devnet'te bulunamadı ya da henüz onaylanmadı");
    if (tx.meta?.err) return fail(422, "tx_failed", "İşlem zincirde başarısız olmuş");

    const msg = tx.transaction.message;
    const accountKeys = msg.getAccountKeys({
      accountKeysFromLookups: tx.meta?.loadedAddresses ?? undefined,
    });

    // --- 2. wallet işlemi imzalamış ---
    const signers = msg.staticAccountKeys.slice(0, msg.header.numRequiredSignatures);
    if (!signers.some((k) => k.equals(wallet))) {
      return fail(403, "wallet_not_signer", "Bu cüzdan işlemi imzalamamış");
    }

    // --- 3. Witness programının register_recording çağrısı, hash eşleşiyor ---
    const ix = msg.compiledInstructions.find(
      (i) =>
        accountKeys.get(i.programIdIndex)?.equals(PROGRAM_ID) &&
        startsWith(i.data, REGISTER_IX_DISCRIMINATOR),
    );
    if (!ix) return fail(422, "not_witness_tx", "İşlem Witness programının register_recording'ini çağırmıyor");
    if (toHex(ix.data.slice(8, 40)) !== audioHash) {
      return fail(403, "hash_mismatch", "İşlemdeki hash gönderilen audio_hash ile aynı değil");
    }

    // --- 4. Çağrıdaki hesaplar: [recording PDA, authority, system_program] ---
    const ixPda = accountKeys.get(ix.accountKeyIndexes[0]);
    const ixAuthority = accountKeys.get(ix.accountKeyIndexes[1]);
    if (!ixPda?.equals(pda) || !ixAuthority?.equals(wallet)) {
      return fail(403, "account_mismatch", "İşlemdeki PDA ya da authority beklenenle uyuşmuyor");
    }

    // --- 5. PDA zincirde var ve içeriği eşleşiyor ---
    const info = await conn.getAccountInfo(pda, "confirmed");
    if (!info || !info.owner.equals(PROGRAM_ID)) {
      return fail(404, "recording_not_found", "Bu hash için zincirde Recording hesabı yok");
    }
    const rec = decodeRecording(info.data);
    if (!rec) return fail(422, "bad_recording_account", "Recording hesabı çözülemedi");
    if (rec.audioHash !== audioHash || !rec.authority.equals(wallet)) {
      return fail(403, "recording_mismatch", "Zincirdeki kayıt bu hash/cüzdanla eşleşmiyor");
    }

    // --- 6. Veritabanına yaz (service role, RLS'yi atlar) ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: existing, error: selectError } = await supabase
      .from("recordings")
      .select("*")
      .eq("audio_hash", audioHash)
      .maybeSingle();
    if (selectError) return fail(500, "db_error", selectError.message);
    if (existing) {
      if (existing.tx_signature === txSignature && existing.wallet === wallet.toBase58()) {
        return json(200, { status: "already_registered", recording: existing });
      }
      return fail(409, "conflict", "Bu hash farklı bir işlem ya da cüzdanla kayıtlı");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("recordings")
      .insert({
        audio_hash: audioHash,
        tx_signature: txSignature,
        wallet: wallet.toBase58(),
        pda: pda.toBase58(),
        duration_ms: rec.durationMs,
        anchored_at: new Date(rec.anchoredAt * 1000).toISOString(),
      })
      .select()
      .single();
    if (insertError) {
      // Aynı anda iki istek geldiyse ikincisi primary key'e çarpar
      if (insertError.code === "23505") return fail(409, "conflict", "Bu hash az önce kaydedildi, tekrar deneyin");
      return fail(500, "db_error", insertError.message);
    }

    return json(201, { status: "registered", recording: inserted });
  } catch (e) {
    console.error("register error", e);
    return fail(502, "rpc_error", "Solana RPC'ye ulaşılamadı ya da beklenmedik bir hata oldu");
  }
});

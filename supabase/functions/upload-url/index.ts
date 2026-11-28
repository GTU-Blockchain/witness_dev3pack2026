// Edge Function: upload-url  (owner: Backend + captain)
// Contract: docs/TECHNICAL.md → "Supabase" → Storage / Edge Functions, and "Hash, signature & encryption"
// Status: deployed, but no client calls it yet (encrypted sharing is on the roadmap).
//
// Input:  POST { audio_hash, signature }
//         signature: the ed25519 signature, by the wallet that registered the record, over the message
//         `witness-upload:<audio_hash>` (MWA `signMessages`). base64 or base58; either the 64-byte signature
//         or a signed payload that contains it.
// Output: 200 { path, token, expires_in }
//
// Planned flow: when the user taps "Share", the app encrypts the file on the phone with AES-256-GCM, gets a
// one-time upload permit from this function and uploads the encrypted file to `<audio_hash>.m4a.enc`:
//   supabase.storage.from("recordings").uploadToSignedUrl(path, token, encryptedBytes)
//
// Checks:
//   1. The record is registered (there is a row verified on chain)
//   2. The request comes from the record's owner (the signature is checked against the row's wallet), so
//      nobody else can upload a junk file before the owner and lock the share.
//   3. No file has been uploaded for this record yet. An uploaded file can't be overwritten (no upsert).
// The server can't check the file's contents (encrypted; the key is only in the #k= part). The verification
// page provides integrity: it decrypts, hashes and compares with the chain. A wrong file gives ❌.

import { PublicKey } from "npm:@solana/web3.js@1.98.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import bs58 from "npm:bs58@6.0.0";
import nacl from "npm:tweetnacl@1.0.3";

const BUCKET = "recordings";
const HEX64 = /^[0-9a-f]{64}$/;
const SIGNED_UPLOAD_TTL_SECONDS = 2 * 60 * 60; // Supabase signed upload links are valid for 2 hours

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

// Wallets return the signature in different shapes: just the 64-byte signature, or message + signature
// (signature first or last). Tries every possible 64-byte candidate.
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
  if (req.method !== "POST") return fail(405, "method_not_allowed", "POST only");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json", "Body must be JSON");
  }
  const audioHash = String(body?.audio_hash ?? "").toLowerCase();
  if (!HEX64.test(audioHash)) return fail(400, "bad_audio_hash", "audio_hash must be 64 hex characters");

  const signature = String(body?.signature ?? "").trim();
  if (signature === "" || signature.length > 512) {
    return fail(400, "bad_signature", "signature required: the wallet's signature over `witness-upload:<audio_hash>`");
  }

  const path = `${audioHash}.m4a.enc`;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- 1. Is the record registered? ---
  const { data: row, error: selectError } = await supabase
    .from("recordings")
    .select("audio_hash, wallet")
    .eq("audio_hash", audioHash)
    .maybeSingle();
  if (selectError) return fail(500, "db_error", selectError.message);
  if (!row) return fail(404, "not_registered", "This hash is not registered; call register first");

  // --- 2. Does the request come from the record's owner? ---
  let walletBytes: Uint8Array;
  try {
    walletBytes = new PublicKey(row.wallet).toBytes();
  } catch {
    return fail(500, "db_error", "Could not read the wallet address in the record");
  }
  if (!verifyOwnerSignature(signature, signMessageFor(audioHash), walletBytes)) {
    return fail(403, "not_owner", "The signature is not from the wallet that registered this record");
  }

  // --- 3. Was a file already uploaded? ---
  const { data: existing, error: listError } = await supabase.storage
    .from(BUCKET)
    .list("", { search: path, limit: 1 });
  if (listError) return fail(500, "storage_error", listError.message);
  if (existing?.some((o) => o.name === path)) {
    return fail(409, "already_uploaded", "A file was already uploaded for this record; it can't be overwritten");
  }

  // --- 4. One-time upload permit ---
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !signed) return fail(500, "storage_error", signError?.message ?? "Could not create the signed link");

  // Store the expected share path in the row (the verification page looks it up here)
  const { error: updateError } = await supabase
    .from("recordings")
    .update({ storage_path: path, is_encrypted: true })
    .eq("audio_hash", audioHash);
  if (updateError) return fail(500, "db_error", updateError.message);

  return json(200, { path: signed.path, token: signed.token, expires_in: SIGNED_UPLOAD_TTL_SECONDS });
});

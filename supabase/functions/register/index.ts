// Edge Function: register  (owner: Backend + captain)
// Contract: docs/TECHNICAL.md → "Supabase" → Edge Functions
//
// Input:  POST { audio_hash, tx_signature, wallet, mime_type? }
//         mime_type is optional (e.g. "audio/mp4", "image/jpeg"). If it isn't audio/video, transcript_status = 'skipped'.
// Output: 201 { status: "registered", recording }  or  200 { status: "already_registered", recording }
//
// Trusts none of the input. Before writing the row it verifies on chain that:
//   1. The transaction exists on devnet, is confirmed and succeeded
//   2. `wallet` signed the transaction
//   3. The transaction calls the Witness program's register_recording, and its hash = audio_hash
//   4. The accounts in the call: PDA = ["rec", hash] and authority = wallet
//   5. The PDA exists on chain, is owned by the program, and its authority and audio_hash match
// Then it writes the row with the service role (bypasses RLS). If the same record comes in again, it returns the existing row.

import { Connection, PublicKey } from "npm:@solana/web3.js@1.98.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const PROGRAM_ID = new PublicKey(
  Deno.env.get("WITNESS_PROGRAM_ID") ?? "2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ",
);
const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";

// From program/target/idl/witness.json
const REGISTER_IX_DISCRIMINATOR = [134, 1, 57, 133, 241, 98, 215, 15];
const RECORDING_ACCOUNT_DISCRIMINATOR = [127, 40, 57, 149, 55, 75, 215, 111];

const HEX64 = /^[0-9a-f]{64}$/;
const MIME = /^[a-z0-9]+\/[a-z0-9][a-z0-9.+-]{0,99}$/; // same as the table's check constraint

// Only files with sound get a transcript (ElevenLabs also transcribes the audio track of a video).
function isTranscribable(mime: string | null): boolean {
  return mime === null || mime.startsWith("audio/") || mime.startsWith("video/");
}
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

// Byte length of a base58 string; null on an invalid character. A Solana signature must be exactly 64 bytes.
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

// Decodes a Recording account using its Borsh layout:
// 8 discriminator | 32 authority | 32 audio_hash | 8 recorded_at | 8 anchored_at | 4 duration_ms
// | Option<[u8;32]> location_commitment | 1 bump
// Note: an empty Option (None) takes 1 byte, a full one (Some) 1 + 32 bytes; later fields shift accordingly.
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

// The app calls us right after confirmTransaction; the RPC sometimes sees it a moment late, so retry a few times.
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
  if (req.method !== "POST") return fail(405, "method_not_allowed", "POST only");

  // --- 0. Input format ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json", "Body must be JSON");
  }
  const audioHash = String(body?.audio_hash ?? "").toLowerCase();
  const txSignature = String(body?.tx_signature ?? "");
  const walletInput = String(body?.wallet ?? "");
  const mimeInput = body?.mime_type;

  if (!HEX64.test(audioHash)) return fail(400, "bad_audio_hash", "audio_hash must be 64 hex characters");
  if (base58ByteLength(txSignature) !== 64) {
    return fail(400, "bad_tx_signature", "tx_signature is not a valid Solana signature (64 bytes, base58)");
  }
  let wallet: PublicKey;
  try {
    wallet = new PublicKey(walletInput);
  } catch {
    return fail(400, "bad_wallet", "wallet is not a valid Solana address");
  }
  // Empty / not sent = unknown (old behavior). Parameters such as "image/jpeg; charset=..." are dropped.
  let mimeType: string | null = null;
  if (mimeInput !== undefined && mimeInput !== null && mimeInput !== "") {
    mimeType = String(mimeInput).split(";")[0].trim().toLowerCase();
    if (!MIME.test(mimeType)) return fail(400, "bad_mime_type", "mime_type must look like \"type/subtype\", e.g. image/jpeg");
  }
  const transcriptStatus = isTranscribable(mimeType) ? "pending" : "skipped";

  const conn = new Connection(RPC_URL, "confirmed");
  const pda = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("rec"), hexToBytes(audioHash)],
    PROGRAM_ID,
  )[0];

  try {
    // --- 1. Transaction exists, is confirmed, succeeded ---
    const tx = await getTransactionWithRetry(conn, txSignature);
    if (!tx) return fail(404, "tx_not_found", "Transaction not found on devnet, or not confirmed yet");
    if (tx.meta?.err) return fail(422, "tx_failed", "Transaction failed on chain");

    const msg = tx.transaction.message;
    const accountKeys = msg.getAccountKeys({
      accountKeysFromLookups: tx.meta?.loadedAddresses ?? undefined,
    });

    // --- 2. wallet signed the transaction ---
    const signers = msg.staticAccountKeys.slice(0, msg.header.numRequiredSignatures);
    if (!signers.some((k) => k.equals(wallet))) {
      return fail(403, "wallet_not_signer", "This wallet did not sign the transaction");
    }

    // --- 3. It calls the Witness program's register_recording, and the hash matches ---
    const ix = msg.compiledInstructions.find(
      (i) =>
        accountKeys.get(i.programIdIndex)?.equals(PROGRAM_ID) &&
        startsWith(i.data, REGISTER_IX_DISCRIMINATOR),
    );
    if (!ix) return fail(422, "not_witness_tx", "Transaction does not call the Witness program's register_recording");
    if (toHex(ix.data.slice(8, 40)) !== audioHash) {
      return fail(403, "hash_mismatch", "The hash in the transaction does not match the audio_hash sent");
    }

    // --- 4. Accounts in the call: [recording PDA, authority, system_program] ---
    const ixPda = accountKeys.get(ix.accountKeyIndexes[0]);
    const ixAuthority = accountKeys.get(ix.accountKeyIndexes[1]);
    if (!ixPda?.equals(pda) || !ixAuthority?.equals(wallet)) {
      return fail(403, "account_mismatch", "The PDA or authority in the transaction does not match");
    }

    // --- 5. The PDA exists on chain and its contents match ---
    const info = await conn.getAccountInfo(pda, "confirmed");
    if (!info || !info.owner.equals(PROGRAM_ID)) {
      return fail(404, "recording_not_found", "No Recording account on chain for this hash");
    }
    const rec = decodeRecording(info.data);
    if (!rec) return fail(422, "bad_recording_account", "Could not decode the Recording account");
    if (rec.audioHash !== audioHash || !rec.authority.equals(wallet)) {
      return fail(403, "recording_mismatch", "The on-chain record does not match this hash/wallet");
    }

    // --- 6. Write to the database (service role, bypasses RLS) ---
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
        // If an earlier call (a retry) came without mime_type, fill in the type now
        if (existing.mime_type === null && mimeType !== null) {
          const patch: Record<string, string> = { mime_type: mimeType };
          if (existing.transcript_status === "pending" && transcriptStatus === "skipped") {
            patch.transcript_status = "skipped";
          }
          const { data: updated, error: updateError } = await supabase
            .from("recordings")
            .update(patch)
            .eq("audio_hash", audioHash)
            .select()
            .single();
          if (updateError) return fail(500, "db_error", updateError.message);
          return json(200, { status: "already_registered", recording: updated });
        }
        return json(200, { status: "already_registered", recording: existing });
      }
      return fail(409, "conflict", "This hash is registered with a different transaction or wallet");
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
        mime_type: mimeType,
        transcript_status: transcriptStatus,
      })
      .select()
      .single();
    if (insertError) {
      // If two requests arrive at once, the second hits the primary key
      if (insertError.code === "23505") return fail(409, "conflict", "This hash was just registered, please try again");
      return fail(500, "db_error", insertError.message);
    }

    return json(201, { status: "registered", recording: inserted });
  } catch (e) {
    console.error("register error", e);
    return fail(502, "rpc_error", "Could not reach the Solana RPC, or an unexpected error occurred");
  }
});

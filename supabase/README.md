# /supabase — table, storage and Edge Functions

Not on the critical path: verification only reads the chain, so **if Supabase disappears, no proof is lost.** Supabase holds the transcript, the (optional) shared file, and the hash → transaction mapping.

## Local development

Docker Desktop must be running. Commands run from the repo root.

```bash
supabase start                              # Postgres, API, Storage, Studio; applies migrations
supabase db reset                           # wipe local DB, re-apply migrations (local only!)
supabase functions serve --no-verify-jwt    # hot-reload Edge Functions
supabase stop                               # stop (data kept)
```

Studio: http://127.0.0.1:54323 · API: http://127.0.0.1:54321 · Functions: http://127.0.0.1:54321/functions/v1/<name>

Every schema change is a **new** migration (`supabase migration new <name>`); an applied migration file is never edited.

## Deploying

```bash
supabase link --project-ref <ref>
supabase db push --remote
supabase secrets set ELEVENLABS_API_KEY=...
supabase functions deploy register transcribe upload-url --no-verify-jwt
```

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into functions automatically; secrets prefixed `SUPABASE_` can't be set manually.
- `--no-verify-jwt`: users arrive with a wallet, not a Supabase account, so functions don't expect a logged‑in user. Security is enforced inside each function (`register` verifies against the chain).

## Contents

| File | Description |
| --- | --- |
| `config.jsonc` | Supabase CLI settings (local ports, services) |
| `migrations/…_recordings.sql` | `recordings` table, RLS (anyone reads, anon can't write), private `recordings` bucket |
| `migrations/…_transcript_status_default.sql` | `transcript_status` defaults to `pending` |
| `migrations/…_bucket_read_and_limits.sql` | 25 MB bucket limit; read with the public key, which is safe only because files are to be encrypted on the phone first (encrypted sharing is roadmap; nothing is uploaded yet) |
| `migrations/…_any_file_type.sql` | Any file type: `mime_type` column, `transcript_status = 'skipped'` |
| `functions/register` | Reads the tx from devnet, inserts the row only if the PDA's hash/wallet match |
| `functions/transcribe` | Audio/video only → ElevenLabs Scribe → `transcript`. API key lives only here |
| `functions/upload-url` | One‑time signed upload URL for the encrypted file of a registered recording (no client calls it yet) |

## `register` API

Called **in the background** after the seal tx is confirmed; it never blocks sealing. The function trusts no incoming value: it reads the tx from devnet and verifies that `wallet` signed it, that Witness's `register_recording` was called with this hash and PDA, and that the PDA matches on chain. `pda`, `duration_ms` and `anchored_at` are read from the chain, not from the request.

```ts
const { data, error } = await supabase.functions.invoke("register", {
  body: {
    audio_hash: "04996e6d…87c7",   // 64-char lowercase hex
    tx_signature: "2BEZqQvV…9WU8",  // signature from signAndSendTransactions (base58)
    wallet: "89y28jHh…FNRm",        // signing wallet (base58)
    mime_type: file.mimeType,       // optional but recommended: "audio/mp4", "image/jpeg", "video/mp4"…
  },
});
```

**Success:** `201 { status: "registered", recording }`, or `200 { status: "already_registered", recording }` on a repeat. `transcript_status` starts as `"pending"` for audio/video, `"skipped"` otherwise.

**Any file type:** Witness can seal photos, video, and documents from the share menu. Send `mime_type`; the verification page renders the decrypted file accordingly (image / audio / video / download) and doesn't wait for a transcript. If omitted, audio is assumed (legacy behavior).

**Errors:** body `{ error, message }`

| HTTP | `error` | Meaning | What the app should do |
| --- | --- | --- | --- |
| 400 | `bad_json`, `bad_audio_hash`, `bad_tx_signature`, `bad_wallet`, `bad_mime_type` | Malformed input | Fix the code |
| 404 | `tx_not_found` | Tx not on devnet yet (retried 3×, ~6 s) | Retry in a few seconds |
| 404 | `recording_not_found` | No Recording account on chain for this hash | Check the seal actually succeeded |
| 403 | `wallet_not_signer`, `hash_mismatch`, `account_mismatch`, `recording_mismatch` | Sent values disagree with the chain | Fix: wrong hash/wallet/signature |
| 422 | `tx_failed`, `not_witness_tx`, `bad_recording_account` | Tx failed or isn't Witness's `register_recording` | Bug |
| 409 | `conflict` | This hash is already registered with a different tx | Shouldn't happen; report |
| 502 / 500 | `rpc_error`, `db_error` | RPC or DB issue | Retry later; the proof is on chain, nothing is lost |

**Local test** (against a real devnet record):
`curl -X POST http://127.0.0.1:54321/functions/v1/register -H 'Content-Type: application/json' -d '{"audio_hash":"04996e6d7ffa5d4a6074272e867b29a789c07b0a45a5e63b493dd2919fd187c7","tx_signature":"2BEZqQvVDpgcBM4q5sjeND7MjL4M8apePbtDNwbzJCQGv9GB6vRBVWrndabW7tSkACPPPVZeJH8aMixo41tt9WU8","wallet":"89y28jHhGwDsW3h36vhdE9VL1LpUgX1NKUy92cpqFNRm"}'`

## `transcribe` API

**Audio and video only** (`mime_type` `audio/*` or `video/*`), called in the background after `register`; the Sealed screen never waits for it. The uploaded file must be **the same file that was sealed** (unencrypted m4a): the function compares the file's SHA‑256 to `audio_hash` and never calls ElevenLabs for an unregistered or different file. If already transcribed, it returns the cached result without re‑billing.

```ts
const form = new FormData();
form.append("audio_hash", audioHash);
form.append("file", { uri: fileUri, name: "recording.m4a", type: "audio/mp4" } as any);

const { data, error } = await supabase.functions.invoke("transcribe", { body: form });
// data: { status: "done" | "already_done", transcript, transcript_lang: "tr" | "en" | null }
```

The result is also written to `recordings` (`transcript`, `transcript_lang`, `transcript_status: "done"`), which the list and verification page read from. `transcript_status`: `pending` → `done` or `failed`; `skipped` for non‑audio/video (the UI should hide the transcript field entirely).

| HTTP | `error` | Meaning |
| --- | --- | --- |
| 400 | `bad_form`, `bad_audio_hash`, `missing_file` | Malformed request |
| 400 | `hash_mismatch` | Uploaded file isn't this record — send the exact sealed file (not re‑encoded) |
| 404 | `not_registered` | Call `register` first |
| 413 | `file_too_large` | Over 25 MB |
| 415 | `unsupported_type` | Not audio/video (checked against the row's type, the sent type, and the file's magic bytes); never calls ElevenLabs, row becomes `skipped` |
| 502 | `transcription_failed` | ElevenLabs errored; row marked `failed` |
| 500 | `db_error`, `not_configured` | Server‑side issue |

Known limit: two **simultaneous** requests for the same record can both reach ElevenLabs before the first responds. Fine as long as the app makes one call per record.

## `upload-url` API — encrypted sharing

> **Status: designed, not yet implemented on the client.** The function is deployed, but the app does not encrypt or upload files yet. The flow below is the intended design.

When the user taps "Share": the phone encrypts the file with AES‑256‑GCM → gets a one‑time permit from `upload-url` → uploads the encrypted file. The server can't decrypt it; the key lives only in the share link's `#k=` fragment.

**Upload (app):**

```ts
// 1. Proof of ownership: the wallet that registered the recording signs this message (MWA signMessages)
const message = new TextEncoder().encode(`witness-upload:${audioHash}`);
const [signed] = await signMessages([message]);
const signature = Buffer.from(signed).toString("base64"); // base58 also accepted

// 2. Upload permit
const { data } = await supabase.functions.invoke("upload-url", { body: { audio_hash: audioHash, signature } });
// data: { path: "<audio_hash>.m4a.enc", token, expires_in: 7200 }

await supabase.storage
  .from("recordings")
  .uploadToSignedUrl(data.path, data.token, encryptedBytes, { contentType: "application/octet-stream" });
```

| HTTP | `error` | Meaning |
| --- | --- | --- |
| 400 | `bad_json`, `bad_audio_hash`, `bad_signature` | Malformed request or missing `signature` |
| 403 | `not_owner` | Signature isn't from the registering wallet (or is for another hash) |
| 404 | `not_registered` | Call `register` first |
| 409 | `already_uploaded` | File already exists; can't overwrite. The share link already works |
| 500 | `db_error`, `storage_error` | Server‑side issue |

Rules: path is always `<audio_hash>.m4a.enc`, max **25 MB**, no overwrite, link valid 2 hours.

**Read (verification page):** if the row's `storage_path` is set, the file was shared. With the public key:

```ts
const { data } = await supabase.storage.from("recordings").createSignedUrl(row.storage_path, 3600);
const encrypted = await (await fetch(data.signedUrl)).arrayBuffer();
// decrypt in-browser with the #k= key → SHA-256 → compare to audio_hash and the chain
```

File type: the path is `<audio_hash>.m4a.enc` for all types; the real type is in the row's `mime_type`. After decrypting, render with `new Blob([plain], { type: row.mime_type ?? "audio/mp4" })`: `image/*` → `<img>`, `audio/*` → `<audio>`, `video/*` → `<video>`, else download.

**Ownership:** `upload-url` only permits the wallet that registered the recording. Even though hashes are public on chain, no one can upload a junk file ahead of the owner and lock sharing (`403 not_owner`).

## Security (RLS)

On `recordings`, anyone can read (for the verification page); `anon` writes are disabled. All writes happen via Edge Functions with the service role. There's no Sign‑In‑With‑Solana; `register`'s on‑chain verification is sufficient for the hackathon. The audio goes to ElevenLabs for transcription — this is stated explicitly in the pitch and the transcript setting can be turned off.

# Witness

**A mobile notary for media. Seal any photo, audio, video or document on Solana and let anyone prove it hasn't changed since.**

Witness takes the raw bytes of a file, computes its SHA‑256 fingerprint, and has the user sign an on‑chain record through Mobile Wallet Adapter (Seed Vault on a Seeker, Phantom elsewhere; the app never holds a key). The file itself never leaves the phone. Later, anyone can drop the same file into a public web page that re‑hashes it in the browser and checks the chain:

> **✅ identical to the sealed record** — or — **❌ never sealed / modified since.**

> Witness does **not** prove a file is *true*. It proves that a specific file existed at a specific time and has **not been altered since it was sealed**. That distinction is the whole product.

---

## What it proves (and what it doesn't)

| Claim | Provable? | Backed by |
| --- | --- | --- |
| This file existed no later than time *T* | ✅ Yes | Solana block time (`anchored_at`) |
| Not a single byte has changed since *T* | ✅ Yes | SHA‑256 match |
| This wallet sealed it | ✅ Yes | Ed25519 transaction signature |
| It came from a genuine Seeker device | 🔜 Planned | Seeker Genesis Token (SGT) check — not yet implemented |
| It was captured at location *L* | 🔜 Planned, then claim only | The program has an optional `location_commitment` field; the app does not fill it yet. Even then it is phone GPS, not cryptographic |
| The *content* is real / unstaged | ❌ No | You can hold a speaker to a mic. We say "unaltered", never "true" |

## Live & on‑chain

- **Verification site:** https://web-pi-cyan-30.vercel.app (hashes in your browser, reads straight from Solana RPC — you don't have to trust us)
- **Program (devnet):** [`2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ`](https://explorer.solana.com/address/2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ?cluster=devnet)
- **Status:** full flow proven end‑to‑end on devnet — audio recordings and shared/picked photos sealed, then independently re‑verified (browser hash + `getAccountInfo` on the PDA, byte‑for‑byte match).

## Built today

Everything in this list is in the code and runs on devnet now. Anything not listed here is in the [Roadmap](#roadmap).

- In-app audio recording (m4a / AAC)
- "Share → Witness" and the system file picker, for any media type
- On-device SHA‑256 of the file's raw bytes (the browser verifier streams files over 64 MB)
- Signing through Mobile Wallet Adapter (any MWA wallet; tested with Phantom)
- Anchor program `register_recording` on devnet: one immutable record per hash; no close, no update, no admin
- `register` Edge Function that independently re-verifies the tx, signer, instruction, PDA and account before writing to the DB
- Browser verifier: in-browser hash → PDA → `getAccountInfo` → ✅ / ❌; it never uploads the file
- Optional transcription (ElevenLabs Scribe) for audio and video

## How it works

Critical path: **app → MWA wallet → program → PDA ← verification page.** Supabase and ElevenLabs (dashed) are additive — if they go down, sealing and verification still work, because the proof lives entirely on‑chain.

```mermaid
flowchart LR
  subgraph Phone["Seeker / Android"]
    APP["Witness app<br/>record · share · pick file<br/>SHA-256 + build tx"]
    SV["MWA wallet<br/>(Seed Vault on Seeker, Phantom elsewhere)<br/>app never holds the key"]
  end
  subgraph Chain["Solana devnet"]
    PROG["Witness program<br/>register_recording<br/>one PDA per hash"]
    PDA["Recording PDA<br/>seed: rec + hash32<br/>time · wallet · duration"]
  end
  WEB["Verification page<br/>Next.js on Vercel<br/>hashes file in-browser"]
  subgraph Backend["Supabase (additive)"]
    EF["Edge Functions<br/>register · transcribe · upload-url"]
    DB["recordings table<br/>tx · wallet · transcript"]
  end
  EL["ElevenLabs Scribe<br/>speech-to-text"]

  APP -- "sign via MWA" --> SV
  SV -- "signed tx" --> PROG
  PROG -- init --> PDA
  WEB -- "read via RPC" --> PDA
  APP -. "register (additive)" .-> EF
  EF --> DB
  EF -. transcription .-> EL
```

### Three ways to seal, one pipeline

Every entry point copies the file untouched and flows into the exact same seal pipeline (`hash → wallet approval → register_recording`):

1. **Record** — capture audio in‑app (m4a / AAC, mono, 44.1 kHz).
2. **Share** — "Share → Witness" from any app (gallery, camera, recorder, Files). Photos, video, audio, PDF.
3. **Pick a file** — "Seal an existing file" opens the system picker for any media. Share‑sheet‑independent, so it works reliably even on stage.

## Example: one real use case

A tenant records a walkthrough video at move-out and seals it. Months later, in a deposit dispute, the
landlord opens the verifier, drops the file in, and sees that it existed on that date and hasn't changed by a
single byte. No account, no app, no trust in Witness.

## Why not just C2PA / Truepic / OpenTimestamps?

| | Where the proof lives | Who you trust | Strippable? |
| --- | --- | --- | --- |
| C2PA / Content Credentials | Manifest embedded in the file | Certificate authorities / signer PKI | Yes: re-saving or uploading usually drops it |
| Truepic-style capture apps | Vendor servers | The vendor | n/a |
| OpenTimestamps | Bitcoin, aggregated | Calendar servers for freshness | No, but no signer identity, slow confirmation |
| **Witness** | Solana account, content-addressed | Nobody: re-hash + RPC read | No: the proof is external to the file |

Witness is complementary to C2PA: a C2PA manifest can carry a Witness anchor so the timestamp survives even
when the manifest is stripped (see [Roadmap](#roadmap)).

## Vision: Witness as a Solana Mobile layer

The app is the core loop. The goal is for it to stop being an app at all.

On a Solana Mobile device, Witness can live in the capture pipeline itself: every photo, voice note and video
is fingerprinted the moment it is written to storage and sealed on Solana, so media from a Seeker is
**provably unaltered by default**: by anyone, permissionlessly, forever.

Three platform pieces make this possible, and they ship together on Solana Mobile:

| Piece | Role in the layer |
| --- | --- |
| **Seed Vault** | Hardware-isolated key the seal can be rooted in |
| **Mobile Wallet Adapter** | Lets a capture service request signatures without holding the key |
| **Open Android capture stack** | `MediaStore` / `ContentObserver` hooks to fingerprint media at write time |

What it takes to get from today's app to that layer is listed concretely in the [Roadmap](#roadmap).
**None of the items below are implemented yet**; today every seal is an explicit, per-file wallet approval.

## Roadmap

Not implemented yet. Each item moves to [Built today](#built-today) only when it is in the code.

- [ ] Capture hook: auto-fingerprint new media via `MediaStore` / `ContentObserver`
- [ ] Delegated signing: a scoped session key authorized once, so background seals need no per-photo approval
- [ ] Merkle rollup: batch many captures into one periodic on-chain root; verify with an inclusion proof
- [ ] Offline queue: hash now, seal when connected
- [ ] Device attestation: Seeker Genesis Token check and/or Android Key Attestation for in-app captures
- [ ] End-to-end encrypted share links (`/v/<hash>#k=<key>`, AES‑256‑GCM)
- [ ] C2PA interop: emit a Content Credentials manifest that carries the Solana anchor

## Cost

Each seal creates one `Recording` account of `Recording::SPACE` = **126 bytes**
([`lib.rs`](program/programs/witness/src/lib.rs)) and sends one transaction with one signature. The app adds
no priority fee itself, but the wallet may: Phantom adds a compute-budget instruction.

| | Per capture | How it was computed |
| --- | --- | --- |
| **Per seal today** (one account + one tx) | **≈ 0.0013–0.0014 SOL** | Rent-exempt deposit 0.00129032 SOL (`solana rent 126`) + network fee: 0.000005 SOL minimum (5,000 lamports × 1 signature); 0.00008 SOL as actually charged through Phantom on devnet (tx [`4kJ7…nctm`](https://explorer.solana.com/tx/4kJ7nzLYtLuzH41nhiTS6tuB2NR4i31xCuHc7a3fMj2sz7Vnq7ETcPwwG6yzr9QRkMNs9jFpPm8W45vz39T3nctm?cluster=devnet), 2026-11-28) |
| **With Merkle rollup** (roadmap): one tx per batch of *N* | ≈ (network fee + one root account's rent) / *N* | Not built. If the root account were also 126 bytes, *N* = 1,000 would come to ≈ 0.0000014 SOL per capture even at Phantom's fee |

The rent deposit is the bulk of the cost. It is locked, not burned: the program has no `close` instruction on
purpose (a proof must not be deletable), so it is never refunded. Devnet SOL is free; rent and the base fee are
the same on mainnet, while priority fees depend on the wallet and network load.

## Known limitations (and planned fixes)

- **First-sealer wins.** Records are addressed by `["rec", hash]`, so whoever seals a hash first owns that
  record. If someone gets the file before its creator seals it, they can register it under their wallet.
  *Fix (v2):* seeds `["rec", authority, hash]`. Every wallet can attest independently, and the verifier shows
  the earliest attestation.
- **One field name for all media.** The on-chain field is still `audio_hash` and `duration_ms` must be > 0,
  from before Witness supported photos and files. *Fix (v2):* `content_hash`, a `media_kind` field, and
  `duration_ms` optional for still media.
- **No device attestation.** A seal proves which wallet signed it, not which device captured the file.
  Imported files and in-app captures look the same on chain. *Planned:* Seeker Genesis Token and Android
  Key Attestation for in-app captures.
- **Exact-byte matching.** Re-encoding (e.g. messaging apps compressing a video) changes the hash. The
  original has to be shared as-is.

## Verify it yourself

```bash
# 1. Hash the original file (must equal the on-chain record)
shasum -a 256 your-file

# 2. Open the verification site and drop the SAME file in
#    → ✅ shows anchored time, wallet, duration
#    → change one byte and re-drop → ❌ "never sealed / modified"
```

The phone, the browser, and `shasum -a 256` all produce the **same** lowercase‑hex SHA‑256 for the same bytes — that cross‑check is the heart of the system.

## Interface contracts

| Topic | Rule |
| --- | --- |
| Hash | SHA‑256 of the file's final raw bytes. Lowercase hex (64 chars) in text, 32 bytes on chain. After sealing the file is **never** re‑encoded, trimmed, or re‑tagged |
| Program | Devnet, `WITNESS_PROGRAM_ID` + `program/target/idl/witness.json`. PDA seeds `["rec", hash32]` — content‑addressed, one record per hash |
| Time | Unix seconds (`i64`) on chain; UI shows local time |
| Share link | `/v/<hash>` + optional `#k=<key>` (roadmap) |
| Privacy | Only the hash, timestamp, duration, and an optional location **commitment** go on chain. Audio, transcript, and raw coordinates **never** touch the chain |
| Secrets | ElevenLabs and Supabase service keys live only in Supabase secrets; the repo ships only `.env.example` |

## Repository

| Folder | Contents |
| --- | --- |
| [`/app`](app) | React Native + Expo **dev build** (Solana Mobile template): UI, recording, MWA signing, hash |
| [`/program`](program) | Anchor program (`register_recording`), tests, IDL |
| [`/web`](web) | Next.js verification page (`/`; `/v/<hash>` on the roadmap), deployed on Vercel |
| [`/supabase`](supabase) | SQL migrations + Edge Functions (`register`, `transcribe`, `upload-url`) |
| [`/docs`](docs) | Technical deep‑dive + fallback spec (and internal team‑planning docs, in Turkish) |

**Tech stack:** React Native / Expo dev build · Mobile Wallet Adapter · `@solana/web3.js` 1.x · Anchor 0.31.x (Rust) · Next.js · Supabase (Postgres + Edge Functions + Storage) · ElevenLabs Scribe.

## Quick start

```bash
git clone https://github.com/GTU-Blockchain/witness_dev3pack2026.git
cd witness_dev3pack2026
cp .env.example .env   # fill in values; .env is never committed
```

Each folder's own README has setup steps. Deep dive: [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

## Why Solana Mobile

Signing goes through Mobile Wallet Adapter, so on a Seeker the key stays in Seed Vault; the app never holds a key. Every seal is an explicit approval in the wallet (biometric on Seed Vault). Mobile Wallet Adapter makes third‑party in‑app signing possible, fees are negligible on devnet, and **anyone** can verify permissionlessly from a browser — no account, no gatekeeper.

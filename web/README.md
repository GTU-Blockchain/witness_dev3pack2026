# /web — verification page

Next.js + `@solana/web3.js` + `@coral-xyz/anchor`, deployed on Vercel. Verification happens **entirely in the browser**: the file never leaves the device, and the page reads directly from Solana RPC — so you don't have to trust us.

**Live:** https://web-pi-cyan-30.vercel.app

## Setup

> The `/web` scaffold is **already set up** and live on Vercel. **Do not** run `create-next-app` on top of it — it would delete existing files and `public/.well-known/assetlinks.json`.

```bash
cd web
npm i                       # anchor 0.31.1, web3.js 1.x, @noble/hashes 1.8.0
npm run dev
```

### ⚠️ Do not touch assetlinks.json

`public/.well-known/assetlinks.json` is required for the mobile app's MWA dApp‑identity verification (Android App Links). This domain (`web-pi-cyan-30.vercel.app`) must match the `uri` in `app/constants/app-config.ts` exactly; deleting/moving it makes Phantom reject signing. If you change the domain, update both `app-config.ts` and the package/fingerprint in assetlinks together.

## Pages

- `/` — drag & drop; "your file never leaves your computer".
- `/v/<hash>` (roadmap, not built yet) — share link. With `#k=` it downloads the encrypted file, decrypts, and verifies; otherwise the user uploads the file themselves.

## Verification steps

1. SHA‑256 of the file's raw bytes → lowercase hex (`lib/hash.ts` → `sha256HexOfFile`; see large files below).
2. `PublicKey.findProgramAddressSync([Buffer.from("rec"), hashBytes], PROGRAM_ID)`.
3. `getAccountInfo(pda)` → missing ❌ / present → decode `Recording` with the Anchor coder ✅.
4. (Planned `/v/<hash>` page) if the uploaded file's hash differs from the URL hash → ❌ "this is not that record".

Footer, always: *"This page proves the content was not altered after sealing — not that it is true."*

Duration: Witness can seal any file type, so files without a duration (e.g. photos) are written on chain with `duration_ms = 1`. The "Duration" row is shown only for audio/video (`lib/format.ts` → `shouldShowDuration`).

## Large files

The first version used `file.arrayBuffer()` (whole file into memory at once). Since video can now be sealed, a several‑hundred‑MB file could crash the tab — and WebCrypto has no streaming digest. So `lib/hash.ts`:

| File size | Method |
| --- | --- |
| ≤ 64 MB (`STREAM_THRESHOLD_BYTES`) | `crypto.subtle.digest` in one shot (native, fastest) |
| > 64 MB | `file.slice()` into 8 MB chunks (`CHUNK_BYTES`), each fed into an incremental SHA‑256 (`@noble/hashes` → `sha256.create().update()`). Only one chunk in memory at a time |

The result is the **exact same** SHA‑256 — the hash rule never changes (raw bytes, in order, untransformed; identical to the phone and `shasum -a 256`). A progress percentage is shown for large files. `@noble/hashes` is pinned to **1.8.0** (already used by web3.js/Anchor, no extra download); it's pure JS so it's used only above the threshold. The file is still never uploaded — chunks are read only in browser memory.

## Theme

Colors mirror the shared Witness theme in `app/constants/theme.ts` (`C`) so the page looks identical when reached from the app. Mapping lives at the top of `app/globals.css`; components use tokens only, never hard‑coded colors. The shared theme is dark‑only, so the page is dark‑only too.

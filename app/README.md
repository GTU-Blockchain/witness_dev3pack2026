# /app — Witness mobile app

React Native + **Expo dev build** (MWA does not work in Expo Go), started from the Solana Mobile Expo template. Handles the UI, audio recording, hashing, and hardware‑wallet signing via Mobile Wallet Adapter.

## Setup

> The `/app` scaffold is **already generated** (Solana Mobile `expo-web3js-minimal` template, prebuilt `android/` dev build). **Do not** run `create-expo-app` on top of it. Install and run:

```bash
cd app
npm i
npx expo run:android      # Seeker or emulator (dev build, NOT Expo Go)
```

Key packages: `@solana-mobile/mobile-wallet-adapter-protocol-web3js`, `@solana/web3.js`, `@coral-xyz/anchor`, `expo-crypto` / `react-native-quick-crypto`, `expo-audio`, `expo-share-intent`, `expo-document-picker`.

### MWA dApp identity (assetlinks + autoVerify) — do not break

Wallets like Phantom verify the dApp's identity over MWA using Android App Links. Three things must stay **consistent**:

1. `app/constants/app-config.ts` → `uri = 'https://web-pi-cyan-30.vercel.app'`
2. `/.well-known/assetlinks.json` at that domain's root (package `com.anonymous.app` + signing SHA‑256 fingerprint), served by the `/web` deploy
3. An `autoVerify="true"` intent‑filter for that host in `AndroidManifest.xml` / `app.json` (generated at prebuild)

If any of the three changes, the wallet reports "identity could not be verified" and rejects signing. Manifest changes do **not** arrive via JS reload — a native rebuild (`expo run:android`) is required.

> **Adding a native module?** On a prebuilt dev build, Gradle caches the settings‑phase module list in `android/.gradle`. `./gradlew clean` does **not** clear it. If a newly installed native module (e.g. `expo-document-picker`) is "Cannot find native module", delete `android/.gradle` and rebuild to force a fresh autolinking resolve.

## Screens

| Screen | MVP |
| --- | --- |
| Connect wallet (address, devnet badge, SOL balance, faucet hint) | Yes |
| Record (record/stop, timer, level meter, playback, Seal/Delete, location toggle — off by default) | Yes |
| Seal status (Hash → Wallet approval → Writing to chain → ✅, Explorer link, error + Retry) | Yes |
| My Recordings (list) · Recording detail | Extra |

## Rules

- Audio: m4a (AAC), mono, 44.1 kHz.
- A sealed file is **never** re‑encoded; playback and sharing use the same bytes.
- If writing to chain fails, the recording is not deleted — it stays "pending" and can be retried.
- `authorize({ cluster: "devnet", identity: { name: "Witness", ... } })`; the `auth_token` is cached, later seals use `reauthorize`.
- Separate wallet approval for every seal — each seal is a conscious consent.
- Location goes on chain only as a commitment: `sha256(lat_e5 | lon_e5 | 16-byte salt)`.

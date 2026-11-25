# /web: doğrulama sayfası

**Sahibi:** 4 Web doğrulama · Next.js + `@solana/web3.js` + `@coral-xyz/anchor`, Vercel'e deploy.

Doğrulama tamamen tarayıcıda: dosya sunucuya gitmez, sayfa doğrudan Solana RPC'den okur.

## Kurulum

> **Not (2026-11-25):** `/web` iskeleti **zaten kuruldu** ve Vercel'de canlı: `https://web-pi-cyan-30.vercel.app`. Üzerine tekrar `create-next-app` **çalıştırma** — mevcut dosyaları ve `public/.well-known/assetlinks.json`'ı siler. Mevcut Next.js app router scaffold'unun üstüne doğrulama sayfasını ekle.

```bash
cd web
npm i                       # mevcut bağımlılıklar
npm i @solana/web3.js @coral-xyz/anchor
npm run dev
```

IDL gelene kadar sahte veriyle çalış; sonra `../program/target/idl/witness.json` kullan.

### ⚠️ assetlinks.json'a dokunma

`public/.well-known/assetlinks.json` mobil uygulamanın MWA dApp identity doğrulaması için gerekli (Android App Links). Bu domain (`web-pi-cyan-30.vercel.app`) `app/constants/app-config.ts`'teki `uri` ile birebir aynı olmalı; silme/taşıma, sonra Phantom imzayı reddeder. Domaini değiştireceksen hem `app-config.ts`'i hem assetlinks'teki paket/parmak izini birlikte güncelle.

## Sayfalar

- `/` : sürükle bırak, "Dosya bilgisayarınızdan çıkmaz"
- `/v/<hash>` : paylaşım linki; `#k=` varsa şifreli dosyayı indir, çöz, doğrula. Memo yedeğinde `?tx=<imza>` → tam sözleşme: [`docs/MEMO_YEDEGI_SOZLESMESI.md`](../docs/MEMO_YEDEGI_SOZLESMESI.md)

## Doğrulama

1. `crypto.subtle.digest("SHA-256", await file.arrayBuffer())` → küçük harf hex
2. `PublicKey.findProgramAddressSync([Buffer.from("rec"), hashBytes], PROGRAM_ID)`
3. `getAccountInfo(pda)` → yok ❌ / var → Anchor coder ile `Recording` çöz ✅
4. `/v/<hash>`'te dosya hash'i URL hash'inden farklıysa ❌ "Bu dosya o kayıt değil"

Dipnot her zaman: "Bu sayfa içeriğin doğru olduğunu değil, sonradan değiştirilmediğini kanıtlar."

## Görevler

| Tarih | Görev |
| --- | --- |
| 25 Kas 22:00 | İskelet, tarayıcıda hash, sahte veriyle sonuç ekranı |
| 25 Kas 23:00 | Hash çapraz testi (1 ile) |
| 26 Kas | Gerçek PDA ile ✅/❌ (18:00), Vercel deploy (20:00) |
| 27 Kas | `/v/<hash>` |
| 28 Kas | Şifreli dosya çözme (`#k=`) + transkript |
| 29 Kas | Pitch slayt görselleri |

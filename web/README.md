# /web: doğrulama sayfası

**Sahibi:** 4 Web doğrulama · Next.js + `@solana/web3.js` + `@coral-xyz/anchor`, Vercel'e deploy.

Doğrulama tamamen tarayıcıda: dosya sunucuya gitmez, sayfa doğrudan Solana RPC'den okur.

## Kurulum (ilk kez, 4 yapar)

```bash
cd web
npx create-next-app@latest . --ts --app --eslint
npm i @solana/web3.js @coral-xyz/anchor
npm run dev
```

IDL gelene kadar sahte veriyle çalış; sonra `../program/target/idl/witness.json` kullan.

## Sayfalar

- `/` : sürükle bırak, "Dosya bilgisayarınızdan çıkmaz"
- `/v/<hash>` : paylaşım linki; `#k=` varsa şifreli dosyayı indir, çöz, doğrula. Memo yedeğinde `?tx=<imza>`

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

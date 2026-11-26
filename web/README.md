# /web: doğrulama sayfası

**Sahibi:** 4 Web doğrulama · Next.js + `@solana/web3.js` + `@coral-xyz/anchor`, Vercel'e deploy.

Doğrulama tamamen tarayıcıda: dosya sunucuya gitmez, sayfa doğrudan Solana RPC'den okur.

## Kurulum

> **Not (2026-11-25):** `/web` iskeleti **zaten kuruldu** ve Vercel'de canlı: `https://web-pi-cyan-30.vercel.app`. Üzerine tekrar `create-next-app` **çalıştırma** — mevcut dosyaları ve `public/.well-known/assetlinks.json`'ı siler. Mevcut Next.js app router scaffold'unun üstüne doğrulama sayfasını ekle.

```bash
cd web
npm i                       # bağımlılıklar package.json'da (anchor 0.31.1, web3.js 1.x, @noble/hashes 1.8.0)
npm run dev
```

IDL gelene kadar sahte veriyle çalış; sonra `../program/target/idl/witness.json` kullan.

### ⚠️ assetlinks.json'a dokunma

`public/.well-known/assetlinks.json` mobil uygulamanın MWA dApp identity doğrulaması için gerekli (Android App Links). Bu domain (`web-pi-cyan-30.vercel.app`) `app/constants/app-config.ts`'teki `uri` ile birebir aynı olmalı; silme/taşıma, sonra Phantom imzayı reddeder. Domaini değiştireceksen hem `app-config.ts`'i hem assetlinks'teki paket/parmak izini birlikte güncelle.

## Sayfalar

- `/` : sürükle bırak, "Dosya bilgisayarınızdan çıkmaz"
- `/v/<hash>` : paylaşım linki; `#k=` varsa şifreli dosyayı indir, çöz, doğrula. Memo yedeğinde `?tx=<imza>` → tam sözleşme: [`docs/MEMO_YEDEGI_SOZLESMESI.md`](../docs/MEMO_YEDEGI_SOZLESMESI.md)

## Doğrulama

1. Dosyanın ham baytlarının SHA-256'sı → küçük harf hex (`lib/hash.ts` → `sha256HexOfFile`; büyük dosyalar için aşağıya bak)
2. `PublicKey.findProgramAddressSync([Buffer.from("rec"), hashBytes], PROGRAM_ID)`
3. `getAccountInfo(pda)` → yok ❌ / var → Anchor coder ile `Recording` çöz ✅
4. `/v/<hash>`'te dosya hash'i URL hash'inden farklıysa ❌ "Bu dosya o kayıt değil"

Dipnot her zaman: "Bu sayfa içeriğin doğru olduğunu değil, sonradan değiştirilmediğini kanıtlar."

Süre: Witness her dosya türünü mühürleyebildiği için fotoğraf gibi süresiz dosyalar zincire `duration_ms = 1` ile yazılır (program `> 0` istiyor). "Süre" satırı sadece ses/video dosyalarında gösterilir; tarayıcı türü bilmiyorsa 1 ms süresiz sayılır (`lib/format.ts` → `shouldShowDuration`).

## Tema

Renkler Witness ortak temasıyla birebir aynı: `app/constants/theme.ts` (`C`). Doğrulama sayfası, uygulamadan geçildiğinde aynı görünsün diye kendi paletini tanımlamaz. Ortak tema sadece koyu olduğu için web de sadece koyu temadadır.

- Eşleme `app/globals.css` başındaki `:root` bloğunda, her satırda karşılığıyla birlikte: `--ground` = `C.bg`, `--surface` = `C.surface`, `--ink` = `C.text`, `--muted` = `C.textSoft`, `--faint` = `C.muted`, `--border` = `C.border`, ✅ = `C.emerald` / `C.emeraldSoft`, ❌ = `C.red` / `C.redSoft`, birincil buton = `C.emerald` + `C.onEmerald`.
- `theme.ts` değişirse bu blok da güncellenmeli. Bileşenlerde elle renk yazılmaz, sadece token kullanılır.
- Köşe yarıçapları ve yazı tipleri (Google Sans Flex / Code, `public/fonts`) ortak temada tanımlı olmadığı için Gemini tasarım maketinden alındı.

## Büyük dosyalar

**Sorun:** İlk sürüm hash için `file.arrayBuffer()` kullanıyordu; bu, dosyanın tamamını tek seferde belleğe alır. Artık video da mühürlenebildiği için yüzlerce MB'lık bir dosyada (özellikle telefonda) tarayıcı sekmesi çökebilir. WebCrypto'nun (`crypto.subtle.digest`) parça parça hash'leme desteği yok.

**Çözüm** (`lib/hash.ts`):

| Dosya boyutu | Yöntem |
| --- | --- |
| ≤ 64 MB (`STREAM_THRESHOLD_BYTES`) | Eskisi gibi: tek seferde `crypto.subtle.digest` (tarayıcının yerel, en hızlı yolu) |
| > 64 MB | Dosya `file.slice()` ile 8 MB'lık parçalar (`CHUNK_BYTES`) halinde okunur, her parça artımlı SHA-256'ya (`@noble/hashes` → `sha256.create().update()`) verilir. Bellekte aynı anda sadece bir parça durur |

- **Sonuç birebir aynı SHA-256'dır.** Hash kuralı değişmez: dosyanın ham baytları, sırayla, hiç dönüştürülmeden hash'lenir. Telefonda ve `shasum -a 256` ile aynı hex çıkar.
- Büyük dosyada ekranda ilerleme yüzdesi görünür ("Parmak izi hesaplanıyor… %42").
- `@noble/hashes` **1.8.0**'a sabit: `@solana/web3.js` ve Anchor'un zaten kullandığı sürüm, ek paket indirilmez. Saf JS olduğu için WebCrypto'dan yavaştır; bu yüzden sadece eşiğin üstünde kullanılır.
- Dalga formu (`components/WaveForm.tsx`) ses çözmek için dosyanın tamamını okur; bu yüzden 64 MB'ın üstündeki dosyalarda çizilmez. Doğrulama sonucunu etkilemez, ✅/❌ hash'ten gelir.
- Dosya yine hiçbir yere gönderilmez; parçalar sadece tarayıcı belleğinde okunur.

## Görevler

| Tarih | Görev |
| --- | --- |
| 25 Kas 22:00 | İskelet, tarayıcıda hash, sahte veriyle sonuç ekranı |
| 25 Kas 23:00 | Hash çapraz testi (1 ile) |
| 26 Kas | Gerçek PDA ile ✅/❌ (18:00), Vercel deploy (20:00) |
| 27 Kas | `/v/<hash>` |
| 28 Kas | Şifreli dosya çözme (`#k=`) + transkript |
| 29 Kas | Pitch slayt görselleri |

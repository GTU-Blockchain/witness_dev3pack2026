# Witness

Seeker'da alınan bir ses kaydının SHA-256 parmak izini Seed Vault cüzdanıyla imzalayıp Solana devnet'e yazar. Doğrulama sayfası dosyayı tarayıcıda hash'leyip zincirdeki kayıtla karşılaştırır: **✅ birebir aynı** ya da **❌ mühürlenmemiş / değiştirilmiş**.

> Bu sistem içeriğin *gerçek* olduğunu değil, mühürlendikten sonra *değiştirilmediğini* kanıtlar.

Detaylar: [`docs/TEKNIK_DOKUMAN.md`](docs/TEKNIK_DOKUMAN.md) (tek doğruluk kaynağı) · Görevler: [`docs/GOREV_PANOSU.md`](docs/GOREV_PANOSU.md)

## Repo yapısı

| Klasör | İçerik | Sahibi |
| --- | --- | --- |
| [`/app`](app) | React Native + Expo dev build (Solana Mobile Expo şablonu), MWA + Seed Vault | 1 Mobil UI, 2 Cüzdan + entegrasyon |
| [`/program`](program) | Anchor programı (`register_recording`), testler, IDL | 3 Solana programı |
| [`/web`](web) | Next.js doğrulama sayfası (`/`, `/v/<hash>`), Vercel | 4 Web doğrulama |
| [`/supabase`](supabase) | SQL migration'ları + Edge Functions (`register`, `transcribe`, `upload-url`) | 5 Backend + kaptan |
| [`/docs`](docs) | Teknik doküman, görev panosu, Claude Code plan prompt'u | 5 Backend + kaptan |

## Ortak kurallar ve arayüz sözleşmeleri

| Konu | Kural |
| --- | --- |
| Hash | Dosyanın son halinin ham baytlarının SHA-256'sı. Metinde küçük harf hex (64 karakter), zincirde 32 bayt. Dosya mühürlendikten sonra **asla** yeniden kodlanmaz, kırpılmaz, metadata eklenmez |
| Ses formatı | m4a (AAC), mono, 44.1 kHz |
| Program | Devnet, `PROGRAM_ID` + `program/target/idl/witness.json`. PDA seed'leri `["rec", hash32]` |
| Zaman | Zincirde Unix saniye (`i64`), UI'da İstanbul saati |
| Supabase tablosu | `recordings` (bkz. `supabase/migrations`) |
| Paylaşım linki | `/v/<hash>` + isteğe bağlı `#k=<anahtar>`, Memo yedeğinde `?tx=<imza>` |
| Memo formatı | `witness:v1:<hash hex>` |
| Gizlilik | Zincire sadece hash, zaman, süre ve isteğe bağlı konum **commitment**'ı yazılır. Ses, transkript, açık koordinat asla zincire gitmez. `attach_transcript` yok |
| Branch | Herkes kendi klasöründe çalışır, `main`'e küçük ve sık PR. Ortak dosyalar (IDL, `.env.example`) sadece sahibi tarafından değiştirilir |
| Gizli anahtarlar | ElevenLabs ve Supabase service key sadece Supabase secrets'ta. Repo'da sadece `.env.example` |
| Check-in | Günde 3 kez 10 dk (sabah, öğle, akşam): ne bitti, ne takıldı, kim kimi bekliyor |

## Hızlı başlangıç

```bash
git clone https://github.com/GTU-Blockchain/witness_dev3pack2026.git
cd witness_dev3pack2026
cp .env.example .env   # değerleri doldur, .env commit'lenmez
```

Her klasörün kendi README'sinde kurulum adımları ve o rolün görevleri var.

## Hash çapraz testi

Aynı m4a dosyası üç yerde aynı sonucu vermeli:

```bash
shasum -a 256 kayit.m4a          # terminal
# telefon: expo-crypto / react-native-quick-crypto
# tarayıcı: crypto.subtle.digest("SHA-256", buf)
```

## Yol haritası

| Tarih | Kapı |
| --- | --- |
| 25 Kas | Seeker'dan devnet'e imzalı işlem gitti (Memo testi) |
| 26 Kas | MVP uçtan uca: kaydet → mühürle → doğrula → kes → ❌ |
| 27–28 Kas | Ekstralar (Genesis rozeti, transkript, paylaşım, şifreleme) |
| 29 Kas 13:00 | Feature freeze, demo, gönderim |

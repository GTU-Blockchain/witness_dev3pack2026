# Witness Görev Panosu v2

_25 Kasım 2026 güncellemesi. Notion'daki "Görevler" tablosunun aynısı. Saatler İstanbul saati._

Öncelik: **Hedef** = gün sonu kapısı, **MVP** = olmazsa olmaz, **Ekstra** = MVP sağlamsa, **Hazırlık** = kurulum.
Roller: 1 Mobil UI · 2 Cüzdan + entegrasyon · 3 Solana programı · 4 Web doğrulama · 5 Backend + kaptan · 6 Katman 1 (Paylaş-menüsü mühürleme, Rol 2+3'ün ek hattı).
Durum: `[x]` bitti · `[~]` kısmen · `[ ]` yapılmadı. (27 Kas güncellemesi: **MVP uçtan uca bağlandı ve devnet'te bağımsız doğrulandı** — kaydet→mühürle→doğrula tam akış gerçek ekranlarla çalışıyor (PR #14), backend app'e eklendi (PR #15), New Arch transcribe fix (PR #16), Rol 6 Share-to-Seal canlı (PR #17). Ses + foto zincirde mühürlendi, hash eşleşmesi teyit edildi — detay `docs/GOREV_DAGILIMI.md`.)

## Hazırlık 1 (25 Kas, Çarşamba)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [x] | Telegram: önceden kod / şablon serbest mi | 5 | Hazırlık | 25 Kas | Cevap: serbest |
| [x] | Telegram: Türkiye local track var mı, önceden kod jüriye beyan edilmeli mi | 5 | Hazırlık | 25 Kas 18:00 | Cevap: local track var |
| [ ] | Rolleri isimlere ata ve Kişi alanlarını doldur | Herkes | Hazırlık | 25 Kas 13:30 | |
| [x] | Repo aç (/app /program /web /supabase /docs) + ortak kuralları README'ye yaz | 5 | Hazırlık | 25 Kas 15:00 | Teknik dokümandaki Ortak kurallar tablosu |
| [x] | Geliştirme ortamı kur ve hello world çalıştır (Android Studio, Rust, Solana CLI, Anchor, Node) | Herkes | Hazırlık | 25 Kas 15:00 | Referans makinede app build + çalışıyor |
| [~] | Hesaplar: ElevenLabs API key, Supabase projesi, Vercel, her cüzdana devnet SOL | 5 | Hazırlık | 25 Kas 16:00 | Supabase (Frankfurt) + Vercel + ElevenLabs (sponsor hesabı) hazır; cüzdan SOL kaldı |
| [x] | Seeker'da Seed Vault Wallet kurulu mu, devnet'e geçiyor mu kontrol et | 2 | MVP | 25 Kas 14:00 | Seeker yok; emülatör + Phantom ile devnet bağlantısı teyit edildi |
| [x] | MWA dokümanı: signAndSendTransactions üçüncü parti uygulamada çalışıyor mu | 2 | MVP | 25 Kas 14:00 | Pratikte kanıtlandı (Phantom in-app imza) |
| [x] | **İLK İŞ:** Seeker'dan MWA ile devnet'e hash içeren Memo işlemi gönder (Memo yedeği de bu) | 2 | MVP | 25 Kas 18:00 | ✅ In-app Phantom imzası → devnet finalized (tx 246bvDWt…F4iYn) |
| [x] | Kayıt ekranı: kaydet / durdur / dinle, m4a (AAC, mono, 44.1 kHz) çıktısı | 1 | MVP | 25 Kas 22:00 | ✅ Gerçek ses kaydı + navigasyon bağlandı (PR #14); `record.tsx` → `/seal` → My Recordings |
| [x] | Dosyanın SHA-256 hash'ini telefonda hesapla | 2 | MVP | 25 Kas 20:00 | ✅ `app/utils/witness-hash.ts` (expo-crypto), shasum ile doğrulandı; `/seal` hattına bağlandı (PR #14) |
| [x] | Anchor programı: Recording hesabı + register_recording + testler | 3 | MVP | 25 Kas 20:00 | Program yazıldı + 4 test localnet'te geçti |
| [x] | Programı devnet'e deploy et, program ID + IDL paylaş | 3 | MVP | 25 Kas 23:00 | ✅ `2CyjSQFX…FZeeYJ` devnet'te; IDL + env'ler commit'li |
| [x] | Doğrulama sayfası iskeleti (Next.js, tarayıcıda hash, sahte veriyle sonuç ekranı) | 4 | MVP | 25 Kas 22:00 | ✅ Canlı; `web-pi-cyan-30.vercel.app` dalga formu + ✅/❌ sonuç ekranı |
| [x] | Hash çapraz testi: aynı dosya telefonda, tarayıcıda ve `shasum -a 256` ile aynı hash | 4 | MVP | 25 Kas 23:00 | ✅ Uçtan uca kanıt: mühürlü dosya Mac'e çekildi, tarayıcı + `shasum` + zincir hash'i birebir aynı (foto `0ac3b342…`, ses `fcb7757e…`) |
| [x] | Supabase: recordings tablosu + private storage bucket + RLS | 5 | Ekstra | 25 Kas 22:00 | ✅ Canlıda; URL + public key `.env.example`'da |
| [x] | ElevenLabs Scribe denemesi (Türkçe kayıt) | 5 | Ekstra | 25 Kas 22:00 | ✅ Türkçe çalışıyor; dil kodu `tur` → `tr` |
| [x] | **GÜN SONU HEDEFİ:** Seeker'dan devnet'e imzalı işlem gitti, Explorer'da görünüyor | Herkes | Hedef | 25 Kas 23:59 | ✅ In-app Phantom imzası devnet'te finalized (Memo `witness:v1:0000…`) |

## Hazırlık 2 (26 Kas, Perşembe)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [x] | Cüzdan bağla + Mühürleme durumu ekranları | 1 | MVP | 26 Kas 18:00 | ✅ Cüzdan bağla (PR #7/#8) + Mühürleme durumu (`/seal`, PR #14): Hash → Cüzdan onayı → Zincire yazılıyor → ✅ Mühürlendi, Explorer linki |
| [x] | IDL'dan register_recording işlemi kur, imzalat, onay sonrası PDA'yı oku | 2 | MVP | 26 Kas 15:00 | ✅ In-app Phantom imzası → PDA devnet'te finalized; gerçek dosya hash'i `/seal` hattına bağlandı (PR #14) |
| [ ] | SPL Memo yedek yolu: uygulama + web (`?tx=`) hazır | 3 | MVP | 26 Kas 13:00 | Program öğlene kadar deploy değilse Memo ile devam |
| [x] | Gerçek PDA ile doğrulama: dosya yükle → ✅/❌, zaman, cüzdan | 4 | MVP | 26 Kas 18:00 | ✅ `feat/web-verify` merge; PDA + `getAccountInfo` (`web/lib/recording.ts`). Uçtan uca kanıt: mühürlü foto → hash → zincir → ✅ "birebir aynı" (anchored_at + cüzdan + tx) |
| [x] | Doğrulama sayfasını Vercel'e deploy et | 4 | MVP | 26 Kas 20:00 | ✅ `web-pi-cyan-30.vercel.app` otomatik deploy ile canlı |
| [x] | Edge Function'lar: register (zinciri kontrol eder) + transcribe | 5 | Ekstra | 26 Kas 22:00 | ✅ Canlıda (#2, #3); kullanım `supabase/README.md`. Her dosya türü desteği eklendi (PR #6: `mime_type`, `skipped`; transcribe sadece ses/video) |
| [x] | **GÜN SONU HEDEFİ:** MVP uçtan uca (kaydet → mühürle → doğrula → kes → ❌) | Herkes | Hedef | 26 Kas 23:00 | ✅ 27 Kas'ta tamamlandı: ses + foto zincirde mühürlendi, bağımsız doğrulandı (PR #14–17) |

## 1. gün (27 Kas, Cuma)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [x] | Kayıt bilgisini Supabase'e gönder (register çağrısı) | 2 | Ekstra | 27 Kas 15:00 | ✅ Mühür zincirde onaylanınca arka planda `register` (PR #15), zincirden doğrular, mühürlemeyi bekletmez |
| [ ] | Seeker Genesis Token rozeti | 2 | Ekstra | 27 Kas 18:00 | Genesis Token mint adresi teyidi |
| [x] | Transkripti uygulamaya bağla (asenkron, mühürlemeyi bekletmez) | 5 | Ekstra | 27 Kas 20:00 | ✅ `transcribe` app'e bağlı (PR #15) + New Arch upload fix (PR #16); transkript mühür/My Recordings'te kendiliğinden görünür |
| [ ] | Kayıt listesi + transkript görünümü | 1 | Ekstra | 27 Kas 20:00 | |
| [ ] | Paylaşım linki sayfası `/v/<hash>` | 4 | Ekstra | 27 Kas 20:00 | |
| [ ] | Web'e PDA / Memo okumada destek, boşta kalan yere yardım | 3 | Ekstra | 27 Kas 20:00 | |
| [x] | Katman 1 — Paylaş menüsünden mühürleme (Share-to-Seal) canlı UI | 6 | Ekstra | 27 Kas 20:00 | ✅ `ShareIntentHandler` paylaşılan medyayı `/seal` hattına akıtıyor (PR #17); galeriden PNG → mühür → devnet slot 526869476, `getAccountInfo` ✅ |
| [x] | Uygulama içi dosya seçici: "Seal an existing file" → aynı `/seal` hattı | 6 | Ekstra | 27 Kas 20:00 | `expo-document-picker` ile herhangi bir medya seç → mühürle; paylaş-sheet'ine bağımsız, demo için güvenilir giriş (rebuild gerekir) |

## 2. gün (28 Kas, Cumartesi)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [x] | upload-url Edge Function | 5 | Ekstra | 28 Kas 14:00 | ✅ Canlıda (#4), 26 Kas'ta erken bitti |
| [ ] | Paylaşımda AES-256-GCM şifreleme + upload-url ile yükleme | 2 | Ekstra | 28 Kas 18:00 | upload-url Edge Function (5) |
| [ ] | Şifreli dosyayı tarayıcıda çözme (`#k=`) + transkript gösterimi | 4 | Ekstra | 28 Kas 20:00 | |
| [ ] | Kayıt detayı ekranı + UI cilası | 1 | Ekstra | 28 Kas 20:00 | |
| [ ] | Konum: varsayılan kapalı, zincire sadece commitment (açık koordinat yok) | 2 | Ekstra | 28 Kas 22:00 | |
| [ ] | README, repo düzeni | 3 | Ekstra | 28 Kas 22:00 | |
| [ ] | Benzer ürün araması (sesi on-chain mühürleyen) + pitch taslağı | 5 | Ekstra | 28 Kas 22:00 | |

## 3. gün (29 Kas, Pazar)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [ ] | Hata düzeltme, **13:00 FEATURE FREEZE** | Herkes | Hedef | 29 Kas 13:00 | |
| [ ] | Son APK build | 2 | MVP | 29 Kas 15:00 | |
| [ ] | Demo ekran kaydı (scrcpy) + Audacity ile kesilmiş dosya | 1 | MVP | 29 Kas 16:00 | |
| [ ] | Pitch slayt görselleri | 4 | MVP | 29 Kas 16:00 | |
| [ ] | Pitch + 90 sn demo videosu, sunum provası | 5 | MVP | 29 Kas 17:00 | |
| [ ] | Devnet program ID + README son hali + gönderim | 3 | MVP | 29 Kas 19:00 | |

## Eski panodan farklar

- Telegram sorusu kapandı (önceden kod serbest)
- "Boş işlem gönder" testi, hash içeren Memo testine dönüştü ve Memo yedeğiyle birleşti
- `attach_transcript` kaldırıldı; transkript sadece Supabase'de
- Eklenenler: hash çapraz testi, konum gizliliği, şifreli paylaşım, `upload-url`
- Riskli işler 25–26 Kasım'a çekildi; MVP hackathon başlamadan bitiyor

# Witness Görev Panosu v2

_25 Kasım 2026 güncellemesi. Notion'daki "Görevler" tablosunun aynısı. Saatler İstanbul saati._

Öncelik: **Hedef** = gün sonu kapısı, **MVP** = olmazsa olmaz, **Ekstra** = MVP sağlamsa, **Hazırlık** = kurulum.
Roller: 1 Mobil UI · 2 Cüzdan + entegrasyon · 3 Solana programı · 4 Web doğrulama · 5 Backend + kaptan.
Durum: `[x]` bitti · `[~]` kısmen · `[ ]` yapılmadı. (26 Kas güncellemesi: İLK İŞ + gün sonu hedefi ✅, kişi planları `docs/GOREV_DAGILIMI.md`.)

## Hazırlık 1 (25 Kas, Çarşamba)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [x] | Telegram: önceden kod / şablon serbest mi | 5 | Hazırlık | 25 Kas | Cevap: serbest |
| [x] | Telegram: Türkiye local track var mı, önceden kod jüriye beyan edilmeli mi | 5 | Hazırlık | 25 Kas 18:00 | Cevap: local track var |
| [ ] | Rolleri isimlere ata ve Kişi alanlarını doldur | Herkes | Hazırlık | 25 Kas 13:30 | |
| [x] | Repo aç (/app /program /web /supabase /docs) + ortak kuralları README'ye yaz | 5 | Hazırlık | 25 Kas 15:00 | Teknik dokümandaki Ortak kurallar tablosu |
| [x] | Geliştirme ortamı kur ve hello world çalıştır (Android Studio, Rust, Solana CLI, Anchor, Node) | Herkes | Hazırlık | 25 Kas 15:00 | Referans makinede app build + çalışıyor |
| [ ] | Hesaplar: ElevenLabs API key, Supabase projesi, Vercel, her cüzdana devnet SOL | 5 | Hazırlık | 25 Kas 16:00 | Supabase + Vercel hazır; ElevenLabs + cüzdan SOL kaldı |
| [x] | Seeker'da Seed Vault Wallet kurulu mu, devnet'e geçiyor mu kontrol et | 2 | MVP | 25 Kas 14:00 | Seeker yok; emülatör + Phantom ile devnet bağlantısı teyit edildi |
| [x] | MWA dokümanı: signAndSendTransactions üçüncü parti uygulamada çalışıyor mu | 2 | MVP | 25 Kas 14:00 | Pratikte kanıtlandı (Phantom in-app imza) |
| [x] | **İLK İŞ:** Seeker'dan MWA ile devnet'e hash içeren Memo işlemi gönder (Memo yedeği de bu) | 2 | MVP | 25 Kas 18:00 | ✅ In-app Phantom imzası → devnet finalized (tx 246bvDWt…F4iYn) |
| [ ] | Kayıt ekranı: kaydet / durdur / dinle, m4a (AAC, mono, 44.1 kHz) çıktısı | 1 | MVP | 25 Kas 22:00 | |
| [~] | Dosyanın SHA-256 hash'ini telefonda hesapla | 2 | MVP | 25 Kas 20:00 | `app/utils/witness-hash.ts` (expo-crypto), shasum ile doğrulandı; ekrana bağlama + rebuild kaldı |
| [x] | Anchor programı: Recording hesabı + register_recording + testler | 3 | MVP | 25 Kas 20:00 | Program yazıldı + 4 test localnet'te geçti |
| [x] | Programı devnet'e deploy et, program ID + IDL paylaş | 3 | MVP | 25 Kas 23:00 | ✅ `2CyjSQFX…FZeeYJ` devnet'te; IDL + env'ler commit'li |
| [~] | Doğrulama sayfası iskeleti (Next.js, tarayıcıda hash, sahte veriyle sonuç ekranı) | 4 | MVP | 25 Kas 22:00 | Next.js + Vercel canlı; hash/sonuç ekranı kaldı |
| [ ] | Hash çapraz testi: aynı m4a telefonda, tarayıcıda ve `shasum -a 256` ile aynı hash | 4 | MVP | 25 Kas 23:00 | Kayıt ekranı (1) + tarayıcıda hash (4); 1 ile birlikte |
| [ ] | Supabase: recordings tablosu + private storage bucket + RLS | 5 | Ekstra | 25 Kas 22:00 | |
| [ ] | ElevenLabs Scribe denemesi (Türkçe kayıt) | 5 | Ekstra | 25 Kas 22:00 | |
| [x] | **GÜN SONU HEDEFİ:** Seeker'dan devnet'e imzalı işlem gitti, Explorer'da görünüyor | Herkes | Hedef | 25 Kas 23:59 | ✅ In-app Phantom imzası devnet'te finalized (Memo `witness:v1:0000…`) |

## Hazırlık 2 (26 Kas, Perşembe)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [ ] | Cüzdan bağla + Mühürleme durumu ekranları | 1 | MVP | 26 Kas 18:00 | |
| [x] | IDL'dan register_recording işlemi kur, imzalat, onay sonrası PDA'yı oku | 2 | MVP | 26 Kas 15:00 | ✅ In-app Phantom imzası → PDA devnet'te finalized (tx 5CBDMgt…, 4ZNRzP7…). Gerçek dosya hash'i bağlama kaldı |
| [ ] | SPL Memo yedek yolu: uygulama + web (`?tx=`) hazır | 3 | MVP | 26 Kas 13:00 | Program öğlene kadar deploy değilse Memo ile devam |
| [ ] | Gerçek PDA ile doğrulama: dosya yükle → ✅/❌, zaman, cüzdan | 4 | MVP | 26 Kas 18:00 | Program ID + IDL (3) |
| [ ] | Doğrulama sayfasını Vercel'e deploy et | 4 | MVP | 26 Kas 20:00 | |
| [ ] | Edge Function'lar: register (zinciri kontrol eder) + transcribe | 5 | Ekstra | 26 Kas 22:00 | |
| [ ] | **GÜN SONU HEDEFİ:** MVP uçtan uca (kaydet → mühürle → doğrula → kes → ❌) | Herkes | Hedef | 26 Kas 23:00 | Çalışmıyorsa 27 Kas'ta ekstra yok, sadece MVP |

## 1. gün (27 Kas, Cuma)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [ ] | Kayıt bilgisini Supabase'e gönder (register çağrısı) | 2 | Ekstra | 27 Kas 15:00 | register Edge Function (5) |
| [ ] | Seeker Genesis Token rozeti | 2 | Ekstra | 27 Kas 18:00 | Genesis Token mint adresi teyidi |
| [ ] | Transkripti uygulamaya bağla (asenkron, mühürlemeyi bekletmez) | 5 | Ekstra | 27 Kas 20:00 | |
| [ ] | Kayıt listesi + transkript görünümü | 1 | Ekstra | 27 Kas 20:00 | |
| [ ] | Paylaşım linki sayfası `/v/<hash>` | 4 | Ekstra | 27 Kas 20:00 | |
| [ ] | Web'e PDA / Memo okumada destek, boşta kalan yere yardım | 3 | Ekstra | 27 Kas 20:00 | |

## 2. gün (28 Kas, Cumartesi)

| Durum | Görev | Rol | Öncelik | Bitiş | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| [ ] | upload-url Edge Function | 5 | Ekstra | 28 Kas 14:00 | |
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

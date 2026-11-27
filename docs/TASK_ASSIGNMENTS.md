# Witness — Görev Dağılımı (5 kişi, rol eşlemesi)

_`docs/TASK_BOARD.md` değişmedi; tek doğruluk kaynağı ve görev/öncelik listesi olarak aynen kalıyor. Bu dosya, panodaki rolleri gerçek kişi sayısına göre eşleyip kişi bazlı yürütme planlarına ayırıyor._

## Neden

Ekip 5 kişi ama `docs/TASK_BOARD.md` görevleri 5 role 1:1 eşliyor (her role bir kişi). Gerçek dağılım farklı: **2 kişi Rol 1 (Mobil UI)**'de, **1 kişi Rol 4 (Web doğrulama)**'da, **1 kişi Rol 5 (Backend + kaptan)**'da, **1 kişi Rol 2 (Cüzdan + entegrasyon) ve Rol 3 (Solana programı)**'nı birlikte üstleniyor. Rol 1'in 2 kişiye bölünmesinde ekrana göre bölüşüm seçildi: Kişi A MVP ekranlarının ikisini (Kayıt + Mühürleme durumu), Kişi B kalan ekranları (Cüzdan bağla + ekstra ekranlar) alıyor.

Türkiye'de local track olduğu teyit edildi.

**Rol 6 (Katman 1 — Paylaş-menüsü mühürleme UI)** ayrı bir kişi değil; Rol 2+3'ü üstlenen kişinin ek iş hattı. **27 Kas'ta tamamlandı ve main'e merge edildi (PR #17):** paylaşılan medya artık ana UI'ın mühürleme hattına (`/seal`) akıyor, emülatörde devnet'te kanıtlandı. Kalan birkaç minor polish aşağıda Rol 6 planında.

## İlerleme durumu (2026-11-27)

Rol 2+3 (Cüzdan + entegrasyon / Solana programı) tarafındaki Sıra 1 adımlarının çoğu bitti; en riskli adım (İLK İŞ) kanıtlandı. 26 Kas'ta ilk gerçek UI ekranları (Kayıt, Cüzdan bağla) ve Supabase'in her dosya türü desteği main'e merge edildi. **27 Kas'ta MVP uçtan uca bağlandı (PR #14), backend app'e eklendi (PR #15), New Arch transcribe fix (PR #16) ve Rol 6 Share-to-Seal (PR #17) merge edildi; tüm akış emülatörde baştan sona devnet'te kanıtlandı — ses + foto mühürlendi, bağımsız doğrulandı.**

| Durum | İş | Not |
| --- | --- | --- |
| ✅ | `/app` Expo dev build bootstrap | `app/` içinde native proje (`android/` prebuild'li); Expo Go değil, MWA için dev build |
| ✅ | **İLK İŞ — Memo testi (risk kapısı)** | `witness:v1:<hash>` memo'su devnet'e düştü; MWA connect gerçek Phantom ile emülatörde çalıştı |
| ✅ | `/web` Next.js iskeleti + Vercel deploy | `https://web-pi-cyan-30.vercel.app`; MWA dApp identity doğrulaması için `/.well-known/assetlinks.json` bu domainden servis ediliyor |
| ✅ | Supabase link | `supabase/config.jsonc` main'de (PR #1); kimse tekrar `supabase init` çalıştırmasın |
| ✅ | Anchor programı build + IDL | `program/target/idl/witness.json` üretildi |
| ✅ | Phantom in-app imza | `witness:v1:0000…` memo'su Phantom ile imzalanıp devnet'te **finalized** (tx `246bvDWt…F4iYn`) |
| ✅ | Anchor testleri (4 senaryo) | `program/tests/witness.ts` localnet'te geçti (geçerli kayıt / çift hash / duration 0 / location) |
| ✅ | SHA-256 hash util | `app/utils/witness-hash.ts` (expo-crypto), `shasum -a 256` ile doğrulandı |
| — | Memo yedeği `?tx=` | Tasarlandı ama uygulanmadı; program sorunsuz deploy olduğu için gerek kalmadı. İlk gün MWA imza testi (SPL Memo) yapıldı, sonra kaldırıldı. |
| ✅ | Anchor devnet deploy | Program ID `2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ`; IDL + TS types + `*_WITNESS_PROGRAM_ID` env'leri commit'li |
| ✅ | `register_recording` çağrısı (in-app Phantom dahil) | `app/utils/witness-program.ts` + in-app buton; emülatörde gerçek Phantom imzasıyla PDA devnet'te finalized. Gerçek dosya hash'ini bağlama (Kişi A kaydı + rebuild) kaldı |
| ✅ | **Katman 1 — Paylaş-menüsü mühürleme (fonksiyonel iskelet)** | `feature/katman-1-share-intent` branch'i; galeriden gerçek foto → Paylaş → Witness → gerçek SHA-256 → register → devnet'te finalized (tx `3GxqbH92…CSHN`, hash `a2aac7fa…fab24`). UI şu an dev-scaffold kartı; gerçek UI **Rol 6** (bkz. aşağı) |
| ✅ | **Rol 4 — Web doğrulama (MVP) merge + deploy + canlı doğrulama** | `feat/web-verify` main'e merge edildi; `web-pi-cyan-30.vercel.app` otomatik deploy ile canlı. Uçtan uca kanıt: Katman 1 ile mühürlenen foto siteye bırakıldı → tarayıcıda hash → zincir → **✅ "birebir aynı"** (hash `a2aac7fa…`, anchored_at + cüzdan + tx gösteriliyor). Kalan: `/v/<hash>`, `?tx=` Memo, `#k=`+transkript, pitch görselleri |
| ✅ | **Rol 5 — Supabase her dosya türü desteği (PR #6)** | `mime_type` kolonu + `transcript_status='skipped'`. `register` opsiyonel `mime_type` alıyor, ses/video değilse transkript atlanıyor; `transcribe` ses/video dışını reddediyor (dosyanın ilk baytlarından magic-number sniff). Katman 1 artık foto/video/belge de mühürleyebilir; doğrulama sayfası çözülen dosyayı türe göre gösterir |
| ✅ | **Rol 1 / Kişi B — Cüzdan bağla ekranı (PR #7 + #8)** | `WalletScreen`: bağla butonu, kısa adres, devnet etiketi, SOL bakiyesi, düşük bakiyede faucet uyarısı. `/wallet` route'u + ana ekran butonuyla navigasyona bağlandı (#8). Fix: `account.address` runtime'da string gelebildiği için `getBalance`'tan önce `PublicKey`'e normalize edildi. Saf `WalletView` + bağlı-parça ayrımı; mock'lanabilir |
| ✅ | **Rol 1 / Kişi A — Kayıt ekranı UI (PR #9)** | `RecordScreen` 4 durum (idle / recording / captured / permission-denied), props + callback'lerle sürülen **saf UI** (`@expo/vector-icons`, `eas.json` eklendi). Kalan: gerçek ses kaydı/m4a çıktısı modülünü props'a bağlamak ve navigasyona (route) eklemek. Şu an `app/src/screens/` altında — ileride `features/` konvansiyonuna taşınabilir |
| ✅ | **Rol 1 — Mühürleme akışı uçtan uca bağlandı (PR #14)** | `record.tsx` → `/seal` (`use-seal.ts`: SHA-256 → bakiye kontrolü → MWA onay → `register_recording` → Sealed) → `recordings.tsx` (My Recordings). Kaydet→mühürle→doğrula tam akış gerçek ekranlarla çalışıyor |
| ✅ | **Rol 5 — Backend app'e bağlandı (PR #15)** | Mühür zincirde onaylanınca **arka planda** `register` (Supabase, zincirden doğrular) + `transcribe` (ElevenLabs); transkript mühür ekranında/My Recordings'te kendiliğinden görünür, mühürlemeyi bekletmez |
| ✅ | **Transcribe upload — New Arch fix (PR #16)** | Fabric açıkken `fetch`+`FormData` dosya upload "Unsupported FormDataPart" verip transkripti hep bozuyordu → `expo-file-system` native `uploadAsync` (legacy). Transkript artık uçtan uca çalışıyor; emülatörde kanıtlandı (sessiz seste ElevenLabs "[konuşma sesi]" döndü = doğru davranış) |
| ✅ | **Rol 6 — Share-to-Seal canlı UI'a bağlandı (PR #17)** | `ShareIntentHandler` (_layout): paylaşılan medya → kalıcı kopya + pending kayıt → `/seal` (aynı kanıtlanmış hat). Galeriden PNG paylaş → mühür → **devnet slot 526869476**, `getAccountInfo` ✅. Resim register'da `image/jpeg`, transkript atlanır; paylaşılan mühürler My Recordings'te de görünür |
| ✅ | **MVP uçtan uca — devnet'te bağımsız kanıt** | Ses kaydı (hash `fcb7757e…`, slot 526836615) + paylaşılan foto (hash `0ac3b342…`, slot 526869476) zincirde mühürlendi; PDA'lar `getAccountInfo` ile doğrulandı, dosyalar Mac'e çekilip hash eşleşmesi teyit edildi. **Kritik MWA blokajı çözüldü:** emülatörde Phantom identity doğrulaması için APK'nın **v1 (JAR) imzası** şart — AGP `enableV1Signing`'i yok sayıyor, apksigner'ı `--min-sdk-version 21` ile zorla (detay `memory` → mwa-phantom-identity-signing) |

Geri kalan ekip (Kişi A/B/C/D) durumu: aşağıdaki kişi planları referans. `/web` artık canlı ve Kişi C bu scaffold üstüne doğrulama sayfasını ekleyebilir; `/app` scaffold'u hazır, Kişi A (Kayıt ekranı UI) ve Kişi B (Cüzdan bağla ekranı) ilk ekranlarını merge etti. İkisi de şimdilik saf UI: Kayıt ekranına ses modülü, iki ekrana da gerçek akış/navigasyon bağlama kaldı (çakışma notu için "Açık sorular").

## Ekip ataması

| Kişi | Rol(ler) | Teslim ettiği |
| --- | --- | --- |
| Rol 2+3 | 2 Cüzdan + entegrasyon, 3 Solana programı | MWA bağlantısı, hash, register_recording çağrısı, Anchor programı, devnet deploy, IDL, Memo yedeği |
| Kişi A | 1 Mobil UI (parça 1) | Kayıt ekranı, Mühürleme durumu ekranı |
| Kişi B | 1 Mobil UI (parça 2) | Cüzdan bağla ekranı, Kayıt listesi, Kayıt detayı |
| Kişi C | 4 Web doğrulama | Next.js doğrulama sayfası, `/v/<hash>`, Vercel deploy |
| Kişi D | 5 Backend + kaptan | Supabase tablo/bucket/RLS, Edge Function'lar, check-in'ler, pitch/demo/gönderim |
| Rol 6 (ben) | 6 Katman 1 — Paylaş-menüsü mühürleme UI | Share-to-Seal akışının gerçek UI'ı: paylaşımla gelen dosyayı mühürleme, dosya önizleme, Phantom dönüşünde kalıcı sonuç. **Ana UI (Rol 1) geldikten sonra** yapılacak |

Ortak kurallar (hash tanımı, ses formatı, PDA seed, Memo formatı, gizli anahtar kuralı) `docs/TECHNICAL.md` → "Ortak kurallar" tablosunda; burada tekrarlanmıyor.

---

## Rol 2 + Rol 3 planı (Cüzdan + entegrasyon / Solana programı)

Rol 3 çıktısı (program ID + IDL) Rol 2'nin girdisi — aynı kişi olduğu için sıralı ilerleyip bekleme olmuyor. `/app` henüz hiç bootstrap edilmemiş; "ilk kez, 2 yapar" kuralına göre Expo projesi bu kişi tarafından kurulur (Kişi A/B'nin üzerine ekran ekleyebilmesi için ön koşul).

### Sıra 1 — Hazırlık / İlk iş (MVP, en riskli adım)

1. **`/app` Expo projesini bootstrap et**
   - `app/` içine `npx create-expo-app@latest . --template @solana-mobile/solana-mobile-expo-template`
   - Paketler: `@solana-mobile/mobile-wallet-adapter-protocol-web3js`, `@solana/web3.js`, `@coral-xyz/anchor`, `expo-crypto`, `expo-av`/`expo-audio`
   - Kabul kriteri: `npx expo run:android` Seeker/emülatörde açılıyor
   - Not: Kişi A/B bu scaffold üstüne ekran ekleyecek — aynı anda `create-expo-app` çalıştırmasınlar

2. **Seed Vault Wallet kontrolü + MWA dokümanı**
   - Seeker cihazında Seed Vault kurulu mu, devnet'e geçiyor mu doğrula
   - `signAndSendTransactions`'ın üçüncü parti uygulamada çalıştığını MWA dokümanından teyit et
   - Kabul kriteri: cihazda devnet modunda cüzdan görünüyor

3. **İLK İŞ — Memo testi (risk kapısı)**
   - `authorize({ cluster: "devnet", identity: {...} })` ile bağlan, SPL Memo programına `witness:v1:<hash hex>` formatında test metni gönder
   - Kural: Memo formatı `witness:v1:<hash hex>` (`docs/TECHNICAL.md` → Memo yedeği)
   - Kabul kriteri: işlem imzası Solana Explorer'da (devnet) görünüyor
   - **Yedek plan:** Çalışmazsa tüm ekibe haber ver, Android emülatör + mock wallet'a geç — bu adım MVP'nin kritik yolu

4. **SHA-256 hesaplama**
   - `expo-crypto` (veya `react-native-quick-crypto`) ile dosyanın ham baytlarından hash
   - Kural: "Dosyanın son halinin ham baytlarının SHA-256'sı, küçük harf hex" — Kişi A'nın kayıt ekranından çıkan m4a dosyasıyla test edilecek
   - Kabul kriteri: aynı dosya `shasum -a 256` ile aynı hex'i veriyor (hash çapraz testinin telefon bacağı)

5. **Anchor programı: testleri gerçek senaryolarla yaz**
   - `program/tests/witness.ts` (şu an `it.skip` placeholder)
   - Senaryolar: geçerli kayıt → PDA açılır + alanlar doğru + `anchored_at` zincir saatinden; aynı hash ikinci kez → başarısız; `duration_ms == 0` → `InvalidDuration`; `location_commitment` null/dolu
   - `program/programs/witness/src/lib.rs` kodu zaten yazılmış — testler onu doğrulayacak
   - Kabul kriteri: `anchor test` localnet'te 4 senaryo da geçiyor

6. **Devnet deploy + program ID/IDL paylaşımı**
   - `anchor build` → `anchor keys sync` → `anchor deploy --provider.cluster devnet`
   - Çıktılar: `PROGRAM_ID` → kök `.env.example`'daki `WITNESS_PROGRAM_ID` / `EXPO_PUBLIC_WITNESS_PROGRAM_ID` / `NEXT_PUBLIC_WITNESS_PROGRAM_ID` satırlarına; `program/target/idl/witness.json` commit edilir
   - Kabul kriteri: Kişi C ve Rol 2 IDL'ı kullanabiliyor; Explorer'da program görünüyor

**Hedef (herkes):** Seeker'dan devnet'e imzalı işlem gitti. Gitmezse herkes buraya destek olur.

### Sıra 2 — MVP'yi uçtan uca bağla

7. **IDL'dan `register_recording` çağrısı kur** — `/app` içinde Anchor coder ile instruction encode, MWA `signAndSendTransactions` ile imzalat, onay sonrası PDA'yı `getAccountInfo` ile oku. Bağımlılık: adım 6.
8. **SPL Memo yedek yolu** (app + web `?tx=`) — program deploy'u gecikirse bu yola geç; `?tx=<imza>` sözleşmesini bu rol belirler, Kişi C web tarafını yapar.

**Hedef (herkes):** MVP uçtan uca çalışıyor (kaydet → mühürle → doğrula → kes → ❌).

### Sıra 3 — Ekstra (MVP sağlamsa)

9. Kayıt bilgisini Supabase'e gönder (`register` çağrısı) — Kişi D'nin `register` Edge Function'ını bekler, mock response ile ilerle. Seeker Genesis Token rozeti — mint adresi teyidi açık soru.
10. AES-256-GCM şifreleme + `upload-url` ile yükleme — Kişi D'nin `upload-url` Edge Function'ını bekler, mock URL ile ilerle. Konum commitment: `sha256(lat_e5 | lon_e5 | 16 bayt salt)`, varsayılan kapalı.
11. Son APK build. Devnet program ID + `program/README.md` son hali + gönderim. Feature freeze'den önce bitmeli.

### Riskler

| Risk | Yedek plan |
| --- | --- |
| MWA/Seed Vault işlem göndermiyor | Memo testi ilk iş; olmazsa emülatör + mock wallet |
| Anchor deploy gecikir | Memo yedeği (adım 8), program sonraya kalabilir |
| Telefon hash'i ↔ tarayıcı hash'i farklı | Kayıt ekranından çıkan dosyayı hiç yeniden kodlamadan Kişi C ile çapraz test |

---

## Kişi A planı: Rol 1 — Kayıt ekranı + Mühürleme durumu ekranı

(`app/README.md` ekran tablosu, `docs/TECHNICAL.md` "Mobil uygulama ve UI")

- **Kayıt ekranı (MVP):** kaydet/durdur butonu, süre sayacı, ses seviyesi göstergesi, durdurunca dinle, "Mühürle"/"Sil" butonları, konum anahtarı (varsayılan kapalı). Çıktı: m4a (AAC, mono, 44.1 kHz). Bağımlılık: Rol 2'nin bootstrap'ladığı `/app` scaffold'u.
- **Mühürleme durumu ekranı (MVP):** adım adım ilerleme (Hash hesaplanıyor → Cüzdan onayı bekleniyor → Zincire yazılıyor → ✅ Mühürlendi), hash'in ilk 8 karakteri, Explorer linki, Paylaş butonu, hata + "Tekrar dene". Bağımlılık: Rol 2'nin register_recording akışı — gelene kadar sahte/mock durum geçişleriyle UI'yı kur.
- Kural: mühürlenen dosya asla yeniden kodlanmaz/kırpılmaz; zincire yazma başarısızsa kayıt silinmez, "Bekliyor" kalır.
- **Ekstra (MVP sağlamsa):** Kayıt listesi + transkript görünümü, UI cilasına destek, demo ekran kaydı (scrcpy).

## Kişi B planı: Rol 1 — Cüzdan bağla ekranı + Kayıt listesi/detayı

- **Cüzdan bağla ekranı (MVP):** "Cüzdanı bağla" butonu, bağlanınca kısaltılmış adres (`7xKq…a9F2`), devnet etiketi, SOL bakiyesi, bakiye düşükse faucet uyarısı. Bağımlılık: Rol 2'nin `authorize`/`reauthorize` entegrasyonu — UI'yı mock bağlı/bağlı-değil state'iyle önceden kurabilir.
- **Kayıt listesi (ekstra):** her satırda tarih, süre, durum rozeti (Mühürlendi/Bekliyor/Hata), transkriptin ilk satırı.
- **Kayıt detayı (ekstra):** oynatıcı, tam hash (kopyala), işlem imzası, zincir zamanı, transkript, paylaşım linki, Seeker rozeti.
- **Ekstra:** UI cilası, son APK'ya destek.

---

## Kişi C planı: Rol 4 — Web doğrulama

(`web/README.md`, `docs/TECHNICAL.md` "Web doğrulama sayfası")

- `npx create-next-app@latest . --ts --app --eslint` + `@solana/web3.js` `@coral-xyz/anchor`; `/` sürükle-bırak iskeleti, tarayıcıda `crypto.subtle.digest("SHA-256", buf)`, sahte veriyle ✅/❌ sonuç ekranı. IDL gelene kadar mock PDA verisiyle çalış.
- Hash çapraz testi — Kişi A'nın kayıt ekranından çıkan dosyayla (telefon/tarayıcı/`shasum -a 256` aynı hex).
- Gerçek PDA ile ✅/❌ — `findProgramAddressSync(["rec", hashBytes], PROGRAM_ID)` → `getAccountInfo` → Anchor coder ile `Recording` çöz. Bağımlılık: Rol 2+3'ün program ID + IDL'ı.
- Vercel'e deploy.
- `/v/<hash>` paylaşım sayfası.
- Şifreli dosya çözme (`#k=`) + transkript gösterimi — Kişi D'nin Supabase/`upload-url`'ine bağımlı.
- Pitch slayt görselleri.
- Memo yedeği gerekirse: `/v/<hash>?tx=<imza>` → `getTransaction` ile memo metnini oku, `blockTime` kullan.
- Dipnot her ekranda: "Bu sayfa içeriğin doğru olduğunu değil, sonradan değiştirilmediğini kanıtlar."

---

## Kişi D planı: Rol 5 — Backend + kaptan

(`supabase/README.md`, `docs/TECHNICAL.md` "Supabase", TASK_BOARD kaptan görevleri)

- **Kalan hazırlık görevleri:** rolleri isimlere ata; hesaplar — ElevenLabs API key, Supabase projesi, Vercel, her cüzdana devnet SOL. (Türkiye local track sorusu teyit edildi: var.)
- `supabase/migrations/20261125000000_recordings.sql` zaten yazılmış — `supabase link` + `supabase db push` ile gerçek projeye uygula, bucket/RLS'i doğrula. ElevenLabs Scribe ile Türkçe kayıt denemesi.
- `supabase/functions/register/index.ts` ve `functions/transcribe/index.ts` şu an 501 stub — gerçek mantığı yaz: `register` işlemi devnet'ten okur, PDA'daki hash/cüzdan eşleşiyorsa satır ekler (sahte kayıt engellenir); `transcribe` ElevenLabs Scribe'a gönderir, API anahtarı sadece Supabase secret'ta.
- Transkripti uygulamaya asenkron bağla (mühürlemeyi bekletmez).
- `functions/upload-url/index.ts` (şu an stub) — `register` edilmiş kayıt için şifreli dosya yükleme URL'si.
- **Kaptan sorumlulukları (sürekli):** düzenli check-in'ler (ne bitti/ne takıldı/kim kimi bekliyor), mentor/jüri iletişimi, benzer ürün araması + pitch taslağı, pitch + demo videosu + sunum provası, gönderim.

---

## Rol 6 planı: Katman 1 — Paylaş-menüsü mühürleme (Share-to-Seal) UI — ✅ BİTTİ (PR #17)

(sahibi: ben)

Fonksiyonel iskelet + gerçek UI entegrasyonu tamamlandı ve emülatörde devnet'te kanıtlandı (galeriden PNG → mühür, slot 526869476). Paylaşılan medya artık ana UI'ın mühürleme hattına akıyor; ayrı/duplicate ekran yok, Rol 1'in ekranları tekrar yazılmadı.

Giriş noktası üçe çıktı ama **üçü de aynı `/seal` hattına** akıyor: (a) uygulama içi Kayıt ekranı, (b) dış paylaşım (OS paylaş menüsü), (c) uygulama içi dosya seçici ("Seal an existing file").

**Yapıldı:**
- ✅ **Uygulama içi dosya seçici (Seal an existing file):** Kayıt ekranında (idle) buton → `expo-document-picker` (`type: '*/*'`) → seçilen dosya `addSharedRecording` ile kalıcı kopya + pending kayıt → `/seal`. Paylaş menüsüyle aynı hat; demo için paylaş-sheet'ine bağımlı değil, %100 güvenilir giriş. Süre picker'dan gelmez (0); `/seal` zincirde `Math.max(1, …)` uyguladığından sorun olmaz.
- ✅ **Odaklı mühürleme ekranı:** `ShareIntentHandler` (`features/record/share-intent-handler.tsx`, _layout'ta her zaman mount) paylaşımı yakalar, dosyayı kalıcı klasöre **kopyalar** (`addSharedRecording`), pending kayıt oluşturur ve **`/seal`'e yönlendirir** — dev kartı yok. Hem kayıt hem paylaşım aynı `use-seal` hattına akıyor.
- ✅ **Kalıcı sonuç:** kayıt `recordings-store`'da; Phantom dönüşünde "Evidence Sealed On-Chain" kalıcı, My Recordings'te de görünür (eski resetOnBackground sorunu yok).
- ✅ **Tipe göre backend:** `backend-sync` kaydın `mimeType`'ını kullanıyor; resim `image/jpeg` register olur, transkript **atlanır** (ElevenLabs'e gitmez).
- ✅ **"Önce cüzdan bağla":** paylaşım geldiğinde cüzdan bağlı değilse `/wallet`'a yönlendirir, kayıt pending kalır (sonradan mühürlenebilir).
- ✅ **Hata + Tekrar dene:** ortak `use-seal` dostça mesajları; foto gibi süresizde `duration_ms` `Math.max(1, …)` (program `duration_ms > 0` istiyor).
- ✅ **Soğuk başlatma:** `singleTask` + `ShareIntentProvider` ile paylaşımla açılış doğrudan mühürlemeye düşüyor.

**Kalan (minor polish, demo'yu bloklamaz):**
- [ ] Aynı dosyayı iki kez paylaşınca iki pending kayıt oluşuyor → aynı hash pending'se yeni kayıt açma (dedup).
- [ ] Dosya önizleme: foto thumbnail / ses oynatıcı (şu an genel seal ekranı; `mimeType`'a göre dallanabilir).
- [ ] Resimde seal/recordings ekranı "00:00 süre" gösteriyor → tipe göre gizle.
- [ ] Eski `account-feature-seal-shared.tsx` + `/dev` kartı artık ölü kod (ShareIntentHandler intent'i önce tüketip reset ediyor) → temizlenebilir.

Teknik durum ve emülatör tuzakları (v1 imza/apksigner, Private DNS, Fake Wallet'ı devre dışı bırakma, android-34→37 imaj değişimi) geliştiricinin `memory` notlarında (`mwa-phantom-identity-signing`, `katman-1-share-intent`).

---

## Riskler (ekip çapında, TASK_BOARD'dan referans — değişmedi)

MWA/Seed Vault başarısızlığı, hash tutarsızlığı, Anchor deploy gecikmesi, devnet/faucet limiti, ElevenLabs gecikmesi, konumun açık kalması — hepsi `docs/TECHNICAL.md` "Riskler, açık kararlar ve demo" tablosunda ve yedekleri zaten tanımlı; bu dosya onları değiştirmiyor, sadece kişilere atıyor.

## Açık sorular

- [ ] Rollere isim atanması (Kişi A/B/C/D gerçek isimlerle değiştirilecek)
- [ ] Seeker Genesis Token mint adresi teyidi (Rol 2 ekstra görevini bloklar)
- [ ] Önceden yazılan kodun jüriye beyan edilmesi gerekiyor mu
- [ ] Kişi A ve Kişi B aynı `/app` klasöründe çalışacak — çakışmayı önlemek için ekrana göre ayrı dosya/branch kullanmaları önerilir (her ekran kendi dosyasında, ortak dosyalara — navigasyon, wallet context — dokunmadan önce diğerine haber versin); bu teknik dokümanda yok, ekip içi bir karar olarak not edildi

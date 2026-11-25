# Witness — Görev Dağılımı (5 kişi, rol eşlemesi)

_`docs/GOREV_PANOSU.md` değişmedi; tek doğruluk kaynağı ve görev/öncelik listesi olarak aynen kalıyor. Bu dosya, panodaki rolleri gerçek kişi sayısına göre eşleyip kişi bazlı yürütme planlarına ayırıyor._

## Neden

Ekip 5 kişi ama `docs/GOREV_PANOSU.md` görevleri 5 role 1:1 eşliyor (her role bir kişi). Gerçek dağılım farklı: **2 kişi Rol 1 (Mobil UI)**'de, **1 kişi Rol 4 (Web doğrulama)**'da, **1 kişi Rol 5 (Backend + kaptan)**'da, **1 kişi Rol 2 (Cüzdan + entegrasyon) ve Rol 3 (Solana programı)**'nı birlikte üstleniyor. Rol 1'in 2 kişiye bölünmesinde ekrana göre bölüşüm seçildi: Kişi A MVP ekranlarının ikisini (Kayıt + Mühürleme durumu), Kişi B kalan ekranları (Cüzdan bağla + ekstra ekranlar) alıyor.

Mevcut durum (bu dosyanın yazıldığı an): repo'da sadece iskelet var — `program/programs/witness/src/lib.rs` yazılmış ama deploy edilmemiş, testler `it.skip` placeholder; `supabase` migration'ı hazır ama Edge Function'lar 501 stub; `/app` ve `/web` sadece README, kod yok. Türkiye'de local track olduğu teyit edildi.

## Ekip ataması

| Kişi | Rol(ler) | Teslim ettiği |
| --- | --- | --- |
| Rol 2+3 | 2 Cüzdan + entegrasyon, 3 Solana programı | MWA bağlantısı, hash, register_recording çağrısı, Anchor programı, devnet deploy, IDL, Memo yedeği |
| Kişi A | 1 Mobil UI (parça 1) | Kayıt ekranı, Mühürleme durumu ekranı |
| Kişi B | 1 Mobil UI (parça 2) | Cüzdan bağla ekranı, Kayıt listesi, Kayıt detayı |
| Kişi C | 4 Web doğrulama | Next.js doğrulama sayfası, `/v/<hash>`, Vercel deploy |
| Kişi D | 5 Backend + kaptan | Supabase tablo/bucket/RLS, Edge Function'lar, check-in'ler, pitch/demo/gönderim |

Ortak kurallar (hash tanımı, ses formatı, PDA seed, Memo formatı, gizli anahtar kuralı) `docs/TEKNIK_DOKUMAN.md` → "Ortak kurallar" tablosunda; burada tekrarlanmıyor.

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
   - Kural: Memo formatı `witness:v1:<hash hex>` (`docs/TEKNIK_DOKUMAN.md` → Memo yedeği)
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

(`app/README.md` ekran tablosu, `docs/TEKNIK_DOKUMAN.md` "Mobil uygulama ve UI")

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

(`web/README.md`, `docs/TEKNIK_DOKUMAN.md` "Web doğrulama sayfası")

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

(`supabase/README.md`, `docs/TEKNIK_DOKUMAN.md` "Supabase", GOREV_PANOSU kaptan görevleri)

- **Kalan hazırlık görevleri:** rolleri isimlere ata; hesaplar — ElevenLabs API key, Supabase projesi, Vercel, her cüzdana devnet SOL. (Türkiye local track sorusu teyit edildi: var.)
- `supabase/migrations/20261125000000_recordings.sql` zaten yazılmış — `supabase link` + `supabase db push` ile gerçek projeye uygula, bucket/RLS'i doğrula. ElevenLabs Scribe ile Türkçe kayıt denemesi.
- `supabase/functions/register/index.ts` ve `functions/transcribe/index.ts` şu an 501 stub — gerçek mantığı yaz: `register` işlemi devnet'ten okur, PDA'daki hash/cüzdan eşleşiyorsa satır ekler (sahte kayıt engellenir); `transcribe` ElevenLabs Scribe'a gönderir, API anahtarı sadece Supabase secret'ta.
- Transkripti uygulamaya asenkron bağla (mühürlemeyi bekletmez).
- `functions/upload-url/index.ts` (şu an stub) — `register` edilmiş kayıt için şifreli dosya yükleme URL'si.
- **Kaptan sorumlulukları (sürekli):** düzenli check-in'ler (ne bitti/ne takıldı/kim kimi bekliyor), mentor/jüri iletişimi, benzer ürün araması + pitch taslağı, pitch + demo videosu + sunum provası, gönderim.

---

## Riskler (ekip çapında, GOREV_PANOSU'dan referans — değişmedi)

MWA/Seed Vault başarısızlığı, hash tutarsızlığı, Anchor deploy gecikmesi, devnet/faucet limiti, ElevenLabs gecikmesi, konumun açık kalması — hepsi `docs/TEKNIK_DOKUMAN.md` "Riskler, açık kararlar ve demo" tablosunda ve yedekleri zaten tanımlı; bu dosya onları değiştirmiyor, sadece kişilere atıyor.

## Açık sorular

- [ ] Rollere isim atanması (Kişi A/B/C/D gerçek isimlerle değiştirilecek)
- [ ] Seeker Genesis Token mint adresi teyidi (Rol 2 ekstra görevini bloklar)
- [ ] Önceden yazılan kodun jüriye beyan edilmesi gerekiyor mu
- [ ] Kişi A ve Kişi B aynı `/app` klasöründe çalışacak — çakışmayı önlemek için ekrana göre ayrı dosya/branch kullanmaları önerilir (her ekran kendi dosyasında, ortak dosyalara — navigasyon, wallet context — dokunmadan önce diğerine haber versin); bu teknik dokümanda yok, ekip içi bir karar olarak not edildi

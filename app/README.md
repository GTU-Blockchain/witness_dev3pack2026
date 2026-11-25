# /app: Witness mobil uygulaması

**Sahipleri:** 1 Mobil UI (ekranlar, kayıt) · 2 Cüzdan + entegrasyon (MWA, hash, işlem)

Stack: React Native + **Expo dev build** (Expo Go'da MWA çalışmaz), Solana Mobile Expo şablonundan başlanır.

## Kurulum

> **Not (2026-11-25):** `/app` scaffold'u **zaten kuruldu** (Solana Mobile `expo-web3js-minimal` şablonu, `android/` prebuild'li dev build). Üzerine tekrar `create-expo-app` **çalıştırma**. Doğrudan bağımlılıkları kurup çalıştır:

```bash
cd app
npm i
npx expo run:android      # Seeker ya da emülatör (dev build; Expo Go değil)
```

Paketler: `@solana-mobile/mobile-wallet-adapter-protocol-web3js`, `@solana/web3.js`, `@coral-xyz/anchor`, `expo-crypto` (veya `react-native-quick-crypto`), `expo-av` / `expo-audio`.

### MWA dApp identity (assetlinks + autoVerify) — bozmayın

Phantom gibi cüzdanlar MWA'da dApp'in kimliğini Android App Links ile doğrular. Bunun çalışması için üç şey birbiriyle **tutarlı** olmalı:

1. `app/constants/app-config.ts` → `uri = 'https://web-pi-cyan-30.vercel.app'`
2. O domainin kökünde `/.well-known/assetlinks.json` (paket `com.anonymous.app` + imza SHA-256 parmak izi) — `/web` deploy'undan servis edilir
3. `AndroidManifest.xml` / `app.json` → o host için `autoVerify="true"` intent-filter (prebuild'de üretilir)

Üçünden biri değişir/kaldırılırsa cüzdan "identity could not be verified" der ve imzayı reddeder. Manifest değişikliği JS reload ile gelmez — native rebuild (`expo run:android`) gerekir.

## Ekranlar

| Ekran | MVP |
| --- | --- |
| 1. Cüzdan bağla (adres, devnet etiketi, bakiye, faucet uyarısı) | Evet |
| 2. Kayıt (kaydet/durdur, süre, seviye, dinle, Mühürle/Sil, konum anahtarı varsayılan kapalı) | Evet |
| 3. Mühürleme durumu (Hash → Cüzdan onayı → Zincire yazılıyor → ✅, Explorer linki, hata + Tekrar dene) | Evet |
| 4. Kayıt listesi | Ekstra |
| 5. Kayıt detayı | Ekstra |

## Kurallar

- Ses: m4a (AAC), mono, 44.1 kHz
- Mühürlenen dosya asla yeniden kodlanmaz; oynatma ve paylaşım aynı baytları kullanır
- Zincire yazma başarısızsa kayıt silinmez, "Bekliyor" kalır
- `authorize({ cluster: "devnet", identity: { name: "Witness", ... } })`, `auth_token` saklanır, sonrası `reauthorize`
- Her kayıt için ayrı cüzdan onayı
- Konum zincire sadece commitment olarak: `sha256(lat_e5 | lon_e5 | 16 bayt salt)`

## Görevler

| Tarih | 1 Mobil UI | 2 Cüzdan + entegrasyon |
| --- | --- | --- |
| 25 Kas | Kayıt ekranı, m4a çıktısı (22:00) | **İlk iş:** MWA ile Memo işlemi (18:00), SHA-256 (20:00) |
| 26 Kas | Cüzdan bağla + Mühürleme durumu (18:00) | IDL'dan `register_recording`, PDA okuma (15:00) |
| 27 Kas | Kayıt listesi + transkript | Genesis rozeti, `register` çağrısı |
| 28 Kas | Kayıt detayı, UI cilası | AES-256-GCM şifreleme + yükleme, konum commitment |
| 29 Kas | Demo ekran kaydı (scrcpy) | Son APK |

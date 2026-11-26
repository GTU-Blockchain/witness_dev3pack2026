# /supabase: tablo, storage ve Edge Functions

**Sahibi:** 5 Backend + kaptan · Kritik yolda değil: Supabase düşse de hiçbir kanıt kaybolmaz.

## Lokal geliştirme

Docker Desktop açık olmalı. Komutlar repo kökünden çalıştırılır.

```bash
supabase start                              # Postgres, API, Storage, Studio; migration'ları uygular
supabase db reset                           # lokal DB'yi sil, migration'ları baştan uygula (sadece lokal!)
supabase functions serve --no-verify-jwt    # Edge Function'ları dosya değişince yeniden yükler
supabase stop                               # durdur (veri kalır)
```

Studio: http://127.0.0.1:54323 · API: http://127.0.0.1:54321 · Fonksiyonlar: http://127.0.0.1:54321/functions/v1/<ad>

Yeni şema değişikliği her zaman **yeni** bir migration'dır (`supabase migration new <ad>`); çalışmış bir migration dosyası düzenlenmez.

## Canlıya kurulum

```bash
supabase link --project-ref <ref>
supabase db push --remote          # CLI 3.x: --remote olmadan lokal DB'ye uygular
supabase secrets set ELEVENLABS_API_KEY=...
supabase functions deploy register transcribe upload-url --no-verify-jwt
```

- `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` fonksiyonlara Supabase tarafından otomatik verilir; `SUPABASE_` ile başlayan secret elle set edilemez.
- `--no-verify-jwt`: kullanıcılar Supabase hesabıyla değil cüzdanla geliyor, bu yüzden fonksiyonlar giriş yapmış kullanıcı beklemez. Güvenlik fonksiyonun içinde sağlanır (`register` işlemi zincirden doğrular).

## İçerik

| Dosya | Açıklama |
| --- | --- |
| `config.jsonc` | Supabase CLI ayarları (lokal portlar, servisler) |
| `migrations/20261125000000_recordings.sql` | `recordings` tablosu, RLS (herkes okur, anon yazamaz), private `recordings` bucket |
| `migrations/20261125154643_recordings_transcript_status_default.sql` | `transcript_status` varsayılanı `pending` |
| `migrations/20261126102917_recordings_bucket_read_and_limits.sql` | Bucket'a 25 MB sınırı; public key ile okuma (dosyalar şifreli) |
| `functions/register` | Girdi: `audio_hash`, `tx_signature`, `wallet`. İşlemi devnet'ten okur, PDA'daki hash/cüzdan eşleşirse satır ekler |
| `functions/transcribe` | Girdi: `audio_hash` + ses. ElevenLabs Scribe → `transcript`. API anahtarı sadece burada |
| `functions/upload-url` | Girdi: `audio_hash`. Kayıt `register` edildiyse şifreli dosya için tek seferlik yükleme URL'si |

## `register` API (uygulama için, rol 2)

Mühürleme işlemi onaylandıktan sonra **arka planda** çağrılır; sonucu mühürlemeyi bekletmez. Fonksiyon gelen hiçbir değere güvenmez: işlemi devnet'ten okur, `wallet`'ın imzaladığını, Witness programının `register_recording`'inin bu hash ve bu PDA ile çağrıldığını ve PDA'nın zincirde eşleştiğini kontrol eder. `pda`, `duration_ms` ve `anchored_at` zincirden okunur, istekte gönderilmez.

```ts
const { data, error } = await supabase.functions.invoke("register", {
  body: {
    audio_hash: "04996e6d…87c7",   // 64 karakter küçük harf hex
    tx_signature: "2BEZqQvV…9WU8",  // signAndSendTransactions'ın döndürdüğü imza (base58)
    wallet: "89y28jHh…FNRm",        // imzalayan cüzdan (base58)
  },
});
```

**Başarılı cevap:** `201 { status: "registered", recording }` ya da aynı kayıt tekrar gönderildiyse `200 { status: "already_registered", recording }`. `recording` tablodaki satırdır (`transcript_status: "pending"` ile başlar).

**Hatalar:** gövde `{ error, message }`

| HTTP | `error` | Anlamı | Uygulama ne yapmalı |
| --- | --- | --- | --- |
| 400 | `bad_json`, `bad_audio_hash`, `bad_tx_signature`, `bad_wallet` | Girdi biçimi yanlış | Hata: kodu düzelt |
| 404 | `tx_not_found` | İşlem devnet'te yok ya da henüz görünmüyor (3 kez denenir, ~6 sn) | Birkaç saniye sonra tekrar dene |
| 404 | `recording_not_found` | Bu hash için zincirde Recording hesabı yok | Mühürleme gerçekten başarılı mı kontrol et |
| 403 | `wallet_not_signer`, `hash_mismatch`, `account_mismatch`, `recording_mismatch` | Gönderilen değerler zincirdekiyle uyuşmuyor | Hata: yanlış hash/cüzdan/imza gönderiliyor |
| 422 | `tx_failed`, `not_witness_tx`, `bad_recording_account` | İşlem başarısız ya da Witness'ın `register_recording`'i değil | Hata |
| 409 | `conflict` | Bu hash başka bir işlemle kayıtlı | Olmamalı; bildir |
| 502 / 500 | `rpc_error`, `db_error` | Solana RPC ya da veritabanı sorunu | Sonra tekrar dene; mühür zincirde olduğu için kanıt kaybolmaz |

**Lokal test:** devnet'teki gerçek bir kayıtla
`curl -X POST http://127.0.0.1:54321/functions/v1/register -H 'Content-Type: application/json' -d '{"audio_hash":"04996e6d7ffa5d4a6074272e867b29a789c07b0a45a5e63b493dd2919fd187c7","tx_signature":"2BEZqQvVDpgcBM4q5sjeND7MjL4M8apePbtDNwbzJCQGv9GB6vRBVWrndabW7tSkACPPPVZeJH8aMixo41tt9WU8","wallet":"89y28jHhGwDsW3h36vhdE9VL1LpUgX1NKUy92cpqFNRm"}'`

## `transcribe` API (uygulama için, rol 2)

`register` başarılı olduktan sonra **arka planda** çağrılır; Mühürlendi ekranı transkripti beklemez. Gönderilen dosya **mühürlenen dosyanın aynısı** olmalı (şifresiz m4a): fonksiyon dosyanın SHA-256'sını `audio_hash` ile karşılaştırır, register edilmemiş ya da farklı bir dosya için ElevenLabs'e hiç gitmez. Transkript zaten yapıldıysa tekrar ücretlendirmez, kayıtlı sonucu döner.

```ts
const form = new FormData();
form.append("audio_hash", audioHash);                                    // 64 karakter küçük harf hex
form.append("file", { uri: fileUri, name: "recording.m4a", type: "audio/mp4" } as any); // React Native

const { data, error } = await supabase.functions.invoke("transcribe", { body: form });
// data: { status: "done" | "already_done", transcript, transcript_lang: "tr" | "en" | null }
```

Sonuç ayrıca `recordings` tablosuna yazılır (`transcript`, `transcript_lang`, `transcript_status: "done"`); kayıt listesi ve doğrulama sayfası oradan okur. `transcript_status` değerleri değişmedi: `pending` → `done` ya da `failed`.

| HTTP | `error` | Anlamı | Uygulama ne yapmalı |
| --- | --- | --- | --- |
| 400 | `bad_form`, `bad_audio_hash`, `missing_file` | İstek biçimi yanlış | Hata: kodu düzelt |
| 400 | `hash_mismatch` | Gönderilen dosya bu kayıt değil | Hata: mühürlenen dosyanın aynısını gönder (yeniden kodlanmamış) |
| 404 | `not_registered` | Önce `register` başarılı olmalı | `register`'dan sonra çağır |
| 413 | `file_too_large` | 25 MB üstü | Demo için kısa kayıt |
| 502 | `transcription_failed` | ElevenLabs hata verdi; satır `failed` oldu | Daha sonra tekrar denenebilir |
| 500 | `db_error`, `not_configured` | Sunucu tarafı sorun | Bildir |

Bilinen sınır: aynı kayıt için **aynı anda** iki istek gelirse ikisi de ElevenLabs'e gidebilir (ilk cevap gelene kadar). Uygulama her kayıt için tek çağrı yaptığı sürece sorun değil.

## `upload-url` API ve paylaşılan dosyayı okuma (rol 2 yükler, rol 4 okur)

Kullanıcı "Paylaş" dediğinde: telefon dosyayı AES-256-GCM ile şifreler → `upload-url`'den tek seferlik izin alır → şifreli dosyayı yükler. Sunucu dosyayı çözemez; anahtar sadece paylaşım linkinin `#k=` kısmında.

**Yükleme (uygulama):**

```ts
const { data, error } = await supabase.functions.invoke("upload-url", { body: { audio_hash: audioHash } });
// data: { path: "<audio_hash>.m4a.enc", token, expires_in: 7200 }

await supabase.storage
  .from("recordings")
  .uploadToSignedUrl(data.path, data.token, encryptedBytes, { contentType: "application/octet-stream" });
```

| HTTP | `error` | Anlamı |
| --- | --- | --- |
| 400 | `bad_json`, `bad_audio_hash` | İstek biçimi yanlış |
| 404 | `not_registered` | Önce `register` başarılı olmalı |
| 409 | `already_uploaded` | Bu kayıt için dosya zaten var; üzerine yazılamaz. Paylaşım linki zaten çalışır |
| 500 | `db_error`, `storage_error` | Sunucu tarafı sorun |

Kurallar: yol her zaman `<audio_hash>.m4a.enc`, dosya en fazla **25 MB**, yüklenen dosyanın üzerine yazılamaz, link 2 saat geçerli. Public key'le linksiz yükleme RLS'ye takılır.

**Okuma (doğrulama sayfası):** `recordings` satırında `storage_path` doluysa dosya paylaşılmıştır. Public key ile:

```ts
const { data } = await supabase.storage.from("recordings").createSignedUrl(row.storage_path, 3600); // 1 saat
const encrypted = await (await fetch(data.signedUrl)).arrayBuffer();
// #k= anahtarıyla tarayıcıda çöz → SHA-256 → audio_hash ile ve zincirle karşılaştır
```

Not: `storage_path`, yükleme izni verildiği anda yazılır. Yükleme yarıda kaldıysa dosya bulunamaz; sayfa bunu "dosya henüz yüklenmemiş" olarak göstermeli.

## Görevler

| Tarih | Görev |
| --- | --- |
| 25 Kas 22:00 | Tablo + bucket + RLS, ElevenLabs Scribe denemesi (Türkçe) |
| 26 Kas 22:00 | `register` (zincir kontrolü) + `transcribe` |
| 27 Kas 20:00 | Transkripti uygulamaya bağla (asenkron) |
| 28 Kas 14:00 | `upload-url` |

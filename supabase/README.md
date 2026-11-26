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

## Görevler

| Tarih | Görev |
| --- | --- |
| 25 Kas 22:00 | Tablo + bucket + RLS, ElevenLabs Scribe denemesi (Türkçe) |
| 26 Kas 22:00 | `register` (zincir kontrolü) + `transcribe` |
| 27 Kas 20:00 | Transkripti uygulamaya bağla (asenkron) |
| 28 Kas 14:00 | `upload-url` |

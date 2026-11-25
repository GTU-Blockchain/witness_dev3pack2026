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
supabase db push
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

## Görevler

| Tarih | Görev |
| --- | --- |
| 25 Kas 22:00 | Tablo + bucket + RLS, ElevenLabs Scribe denemesi (Türkçe) |
| 26 Kas 22:00 | `register` (zincir kontrolü) + `transcribe` |
| 27 Kas 20:00 | Transkripti uygulamaya bağla (asenkron) |
| 28 Kas 14:00 | `upload-url` |

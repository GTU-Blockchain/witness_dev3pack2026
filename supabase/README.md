# /supabase: tablo, storage ve Edge Functions

**Sahibi:** 5 Backend + kaptan · Kritik yolda değil: Supabase düşse de hiçbir kanıt kaybolmaz.

## Kurulum

```bash
supabase link --project-ref <ref>
supabase db push
supabase secrets set ELEVENLABS_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions deploy register transcribe upload-url
```

## İçerik

| Dosya | Açıklama |
| --- | --- |
| `migrations/20261125000000_recordings.sql` | `recordings` tablosu, RLS (herkes okur, anon yazamaz), private `recordings` bucket |
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

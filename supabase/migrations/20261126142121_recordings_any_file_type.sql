-- Witness artık sadece ses değil, her dosyayı mühürleyebiliyor (paylaş menüsü: foto, video, belge...).
-- 1. mime_type: dosyanın türü. Paylaşılan dosya şifreli olduğu için sunucu içine bakamaz; doğrulama
--    sayfası çözdükten sonra resim mi, ses mi, video mu göstereceğini buradan bilir. Uygulama register'da
--    gönderir; isteğe bağlı (boşsa eski davranış: ses kabul edilir).
-- 2. transcript_status = 'skipped': ses/video olmayan dosyalarda transkript hiç yapılmaz
--    ('pending' kalsaydı arayüz sonsuza kadar "transkript geliyor" gösterirdi).

alter table public.recordings
  add column if not exists mime_type text
  check (mime_type ~ '^[a-z0-9]+/[a-z0-9][a-z0-9.+-]{0,99}$');

alter table public.recordings drop constraint if exists recordings_transcript_status_check;
alter table public.recordings
  add constraint recordings_transcript_status_check
  check (transcript_status in ('pending', 'done', 'failed', 'skipped'));

-- Witness now seals any file, not just audio (share menu: photo, video, document...).
-- 1. mime_type: the file's type. A shared file would be encrypted (roadmap), so the server can't look inside;
--    after decrypting, the verification page knows from this whether to show an image, audio or video.
--    The app sends it on register; optional (if empty, old behavior: treated as audio).
-- 2. transcript_status = 'skipped': files that aren't audio/video never get a transcript
--    (if it stayed 'pending', the UI would show "transcript coming" forever).

alter table public.recordings
  add column if not exists mime_type text
  check (mime_type ~ '^[a-z0-9]+/[a-z0-9][a-z0-9.+-]{0,99}$');

alter table public.recordings drop constraint if exists recordings_transcript_status_check;
alter table public.recordings
  add constraint recordings_transcript_status_check
  check (transcript_status in ('pending', 'done', 'failed', 'skipped'));

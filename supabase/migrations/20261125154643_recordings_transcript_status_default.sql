-- transcript_status varsayılanı 'pending' olsun (ilk migration'da default yoktu, satırlar null başlıyordu).
-- Uygulama bu alana bakarak "transkript hazırlanıyor…" gösterecek.
alter table public.recordings
  alter column transcript_status set default 'pending';

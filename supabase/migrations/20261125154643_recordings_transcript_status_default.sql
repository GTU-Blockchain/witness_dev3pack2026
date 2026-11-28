-- Default transcript_status to 'pending' (the first migration had no default, so rows started as null).
-- The app reads this field to show "transcript in progress…".
alter table public.recordings
  alter column transcript_status set default 'pending';

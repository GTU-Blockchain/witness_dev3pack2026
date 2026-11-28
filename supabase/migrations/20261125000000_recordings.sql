-- Witness: recordings table + private storage bucket + RLS
-- Source: docs/TECHNICAL.md → "Supabase"

create table if not exists public.recordings (
  audio_hash        text primary key check (audio_hash ~ '^[0-9a-f]{64}$'),
  tx_signature      text not null,
  wallet            text not null,
  pda               text,                -- empty in the Memo fallback
  duration_ms       int,
  anchored_at       timestamptz,         -- time read from the chain, cached
  transcript        text,
  transcript_lang   text check (transcript_lang in ('tr', 'en')),
  transcript_status text check (transcript_status in ('pending', 'done', 'failed')),
  storage_path      text,                -- only if the user shared the file
  is_encrypted      bool default true,
  has_genesis_token bool,
  created_at        timestamptz default now()
);

-- RLS: everyone can read; anon/authenticated can't write. Writes come from Edge Functions using the service role.
alter table public.recordings enable row level security;

drop policy if exists "recordings public read" on public.recordings;
create policy "recordings public read"
  on public.recordings for select
  to anon, authenticated
  using (true);

-- Storage: private bucket, path <audio_hash>.m4a.enc, reads via signed URL (1 hour)
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

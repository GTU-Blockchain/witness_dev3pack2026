-- Witness: recordings tablosu + private storage bucket + RLS
-- Kaynak: docs/TECHNICAL.md → "Supabase"

create table if not exists public.recordings (
  audio_hash        text primary key check (audio_hash ~ '^[0-9a-f]{64}$'),
  tx_signature      text not null,
  wallet            text not null,
  pda               text,                -- Memo yedeğinde boş
  duration_ms       int,
  anchored_at       timestamptz,         -- zincirden okunan zaman, önbellek
  transcript        text,
  transcript_lang   text check (transcript_lang in ('tr', 'en')),
  transcript_status text check (transcript_status in ('pending', 'done', 'failed')),
  storage_path      text,                -- sadece kullanıcı paylaştıysa
  is_encrypted      bool default true,
  has_genesis_token bool,
  created_at        timestamptz default now()
);

-- RLS: herkes okur, anon/authenticated yazamaz. Yazmalar service role ile Edge Function'lardan.
alter table public.recordings enable row level security;

drop policy if exists "recordings public read" on public.recordings;
create policy "recordings public read"
  on public.recordings for select
  to anon, authenticated
  using (true);

-- Storage: private bucket, yol <audio_hash>.m4a.enc, okuma imzalı URL (1 saat)
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

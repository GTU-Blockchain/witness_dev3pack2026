-- Storage rules for shared files (TECHNICAL → Supabase → Storage). Encrypted sharing is on the roadmap;
-- no client uploads files yet.
--
-- 1) Size limit: no file larger than 25 MB can be uploaded to the bucket (links from upload-url included).
update storage.buckets
set file_size_limit = 26214400
where id = 'recordings';

-- 2) Read: the verification page (public/anon key) can create signed read URLs for / download files in
--    this bucket. By design, files are encrypted on the phone with AES-256-GCM and the key lives only in the
--    share link's #k= part, never on the server, so reading an encrypted file alone reveals nothing.
--    No write/delete policy: uploads only go through the one-time link from upload-url.
drop policy if exists "recordings bucket read" on storage.objects;
create policy "recordings bucket read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'recordings');

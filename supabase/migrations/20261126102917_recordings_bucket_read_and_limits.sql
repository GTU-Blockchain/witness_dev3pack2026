-- Paylaşılan dosyalar için storage kuralları (TEKNIK_DOKUMAN → Supabase → Storage).
--
-- 1) Boyut sınırı: bucket'a 25 MB'tan büyük dosya yüklenemez (upload-url ile verilen linkler de buna tabi).
update storage.buckets
set file_size_limit = 26214400
where id = 'recordings';

-- 2) Okuma: doğrulama sayfası (public/anon key) bu bucket'taki dosyalar için imzalı okuma URL'si
--    oluşturabilsin / indirebilsin. Dosyalar telefonda AES-256-GCM ile şifreli; anahtar sadece paylaşım
--    linkinin #k= kısmında, sunucuya hiç gitmiyor. Bu yüzden şifreli dosyayı okumak tek başına bir şey açmaz.
--    Yazma/silme için policy yok: yükleme sadece upload-url'in verdiği tek seferlik linkle yapılır.
drop policy if exists "recordings bucket read" on storage.objects;
create policy "recordings bucket read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'recordings');

-- Brutos privados para compactação e limite estrito do bucket publicado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-video-uploads',
  'product-video-uploads',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set file_size_limit = 4194304,
    allowed_mime_types = array['video/mp4']
where id = 'product-videos';

drop policy if exists "admin lê brutos de vídeo" on storage.objects;
drop policy if exists "admin insere brutos de vídeo" on storage.objects;
drop policy if exists "admin atualiza brutos de vídeo" on storage.objects;
drop policy if exists "admin remove brutos de vídeo" on storage.objects;

create policy "admin lê brutos de vídeo"
on storage.objects for select to authenticated
using (bucket_id = 'product-video-uploads' and (select private.is_admin()));

create policy "admin insere brutos de vídeo"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-video-uploads' and (select private.is_admin()));

create policy "admin atualiza brutos de vídeo"
on storage.objects for update to authenticated
using (bucket_id = 'product-video-uploads' and (select private.is_admin()))
with check (bucket_id = 'product-video-uploads' and (select private.is_admin()));

create policy "admin remove brutos de vídeo"
on storage.objects for delete to authenticated
using (bucket_id = 'product-video-uploads' and (select private.is_admin()));


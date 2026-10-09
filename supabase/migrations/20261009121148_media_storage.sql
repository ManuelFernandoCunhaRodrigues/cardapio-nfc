-- Storage do Épico 4 (buckets públicos para leitura por URL; escrita e listagem só admin).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 1048576, array['image/webp']),
  ('highlight-images', 'highlight-images', true, 1048576, array['image/webp']),
  ('product-videos', 'product-videos', true, 10485760, array['video/mp4', 'video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "leitura pública de mídia do cardápio" on storage.objects;
drop policy if exists "admin lê mídia do cardápio" on storage.objects;
drop policy if exists "admin insere mídia do cardápio" on storage.objects;
drop policy if exists "admin atualiza mídia do cardápio" on storage.objects;
drop policy if exists "admin remove mídia do cardápio" on storage.objects;

-- Buckets públicos já servem URL pública sem policy SELECT. Esta policy existe
-- apenas para as ações administrativas que listam/confirmam objetos.
create policy "admin lê mídia do cardápio"
on storage.objects for select to authenticated
using (bucket_id in ('product-images', 'highlight-images', 'product-videos') and (select private.is_admin()));

create policy "admin insere mídia do cardápio"
on storage.objects for insert to authenticated
with check (bucket_id in ('product-images', 'highlight-images', 'product-videos') and (select private.is_admin()));

create policy "admin atualiza mídia do cardápio"
on storage.objects for update to authenticated
using (bucket_id in ('product-images', 'highlight-images', 'product-videos') and (select private.is_admin()))
with check (bucket_id in ('product-images', 'highlight-images', 'product-videos') and (select private.is_admin()));

create policy "admin remove mídia do cardápio"
on storage.objects for delete to authenticated
using (bucket_id in ('product-images', 'highlight-images', 'product-videos') and (select private.is_admin()));

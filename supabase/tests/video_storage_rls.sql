-- RLS do Storage de vídeo (compactação de vídeo, testes B2–B4).
-- Rodar inteiro como `postgres` (SQL Editor ou execute_sql) em STAGE. Tudo acontece
-- numa transação que termina em ROLLBACK: nenhum objeto persiste.
-- Falha => RAISE EXCEPTION listando cada verificação divergente.
-- ADMIN_ID = bae2a6b4-c6fd-4567-b01c-01c70e5d940a (admin ativo do SALGAE-STAGING)
-- COMUM_ID = 00000000-0000-0000-0000-0000000000c0 (usuário autenticado sem perfil)

begin;

create temp table _r (k text primary key, v text) on commit drop;
grant all on _r to anon, authenticated;

-- Executa uma instrução e registra 'ok:<linhas>' ou 'erro:<sqlstate>'
create function pg_temp.tentar(chave text, comando text) returns void language plpgsql as $$
declare n bigint;
begin
  execute comando;
  get diagnostics n = row_count;
  insert into _r values (chave, 'ok:' || n) on conflict (k) do update set v = excluded.v;
exception when others then
  insert into _r values (chave, 'erro:' || sqlstate) on conflict (k) do update set v = excluded.v;
end $$;
grant execute on function pg_temp.tentar(text, text) to anon, authenticated;

-- ===================== VISITANTE (anon) =====================
set local role anon;
select pg_temp.tentar('anon.insere_bruto', $q$insert into storage.objects (bucket_id, name) values ('product-video-uploads', 'uploads/teste-anon.mp4')$q$);
reset role;

-- ===================== USUÁRIO COMUM =====================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar('comum.insere_bruto', $q$insert into storage.objects (bucket_id, name) values ('product-video-uploads', 'uploads/teste-comum.mp4')$q$);
reset role;

-- ===================== ADMIN ATIVO =====================
select set_config('request.jwt.claims', '{"sub":"bae2a6b4-c6fd-4567-b01c-01c70e5d940a","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar('admin.insere_bruto', $q$insert into storage.objects (bucket_id, name, owner_id) values ('product-video-uploads', 'uploads/teste-admin-rls.mp4', 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a')$q$);
select pg_temp.tentar('admin.le_bruto',     $q$select 1 from storage.objects where bucket_id = 'product-video-uploads' and name = 'uploads/teste-admin-rls.mp4'$q$);
select pg_temp.tentar('admin.atualiza_bruto', $q$update storage.objects set metadata = '{}'::jsonb where bucket_id = 'product-video-uploads' and name = 'uploads/teste-admin-rls.mp4'$q$);
reset role;

-- Com o objeto do admin existindo, os outros papéis não o enxergam nem o alteram.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar('comum.le_bruto',       $q$select 1 from storage.objects where bucket_id = 'product-video-uploads'$q$);
select pg_temp.tentar('comum.atualiza_bruto', $q$update storage.objects set metadata = '{}'::jsonb where bucket_id = 'product-video-uploads'$q$);
reset role;
set local role anon;
select pg_temp.tentar('anon.le_bruto',        $q$select 1 from storage.objects where bucket_id = 'product-video-uploads'$q$);
select pg_temp.tentar('anon.atualiza_bruto',  $q$update storage.objects set metadata = '{}'::jsonb where bucket_id = 'product-video-uploads'$q$);
reset role;

create temp table _e (k text primary key, v text) on commit drop;
insert into _e values
  ('anon.insere_bruto', 'erro:42501'), ('anon.le_bruto', 'ok:0'), ('anon.atualiza_bruto', 'ok:0'),
  ('comum.insere_bruto', 'erro:42501'), ('comum.le_bruto', 'ok:0'), ('comum.atualiza_bruto', 'ok:0'),
  ('admin.insere_bruto', 'ok:1'), ('admin.le_bruto', 'ok:1'), ('admin.atualiza_bruto', 'ok:1');

do $$
declare falhas text; bucket record;
begin
  select string_agg(format('%s: esperado %s, obtido %s', e.k, e.v, coalesce(r.v, '(não executado)')), E'\n' order by e.k)
    into falhas
  from _e e left join _r r using (k)
  where r.v is distinct from e.v;
  if falhas is not null then
    raise exception E'RLS do Storage de vídeo divergente:\n%', falhas;
  end if;

  select public, file_size_limit, allowed_mime_types into bucket from storage.buckets where id = 'product-video-uploads';
  if bucket.public is distinct from false or bucket.file_size_limit is distinct from 52428800
     or bucket.allowed_mime_types is distinct from array['video/mp4', 'video/quicktime', 'video/webm'] then
    raise exception 'Bucket product-video-uploads fora do esperado: %', row_to_json(bucket);
  end if;
  select public, file_size_limit, allowed_mime_types into bucket from storage.buckets where id = 'product-videos';
  if bucket.public is distinct from true or bucket.file_size_limit is distinct from 4194304
     or bucket.allowed_mime_types is distinct from array['video/mp4'] then
    raise exception 'Bucket product-videos fora do esperado: %', row_to_json(bucket);
  end if;
end $$;

rollback;

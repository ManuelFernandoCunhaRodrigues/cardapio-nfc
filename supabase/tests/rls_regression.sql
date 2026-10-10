-- Regressão de RLS e privilégios (Épico 5, teste H5).
-- Rodar inteiro como `postgres` (SQL Editor ou execute_sql). Tudo acontece numa
-- transação que termina em ROLLBACK: nenhum dado persiste.
-- Falha => RAISE EXCEPTION listando cada verificação divergente.
-- ADMIN_ID = bae2a6b4-c6fd-4567-b01c-01c70e5d940a (admin ativo do SALGAE-STAGING)
-- COMUM_ID = 00000000-0000-0000-0000-0000000000c0 (usuário autenticado sem perfil)

begin;

create temp table _r (k text primary key, v text) on commit drop;
grant all on _r to anon, authenticated;

-- Dados de teste (somem no rollback)
insert into public.categories (id, name, slug, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'Teste RLS inativa', 'teste-rls-inativa', false);
insert into public.products (id, category_id, name, price_cents, is_active) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Teste RLS cat inativa', 100, true),
  ('33333333-3333-3333-3333-333333333333', (select id from public.categories where is_active order by sort_order limit 1), 'Teste RLS inativo', 100, false);
insert into public.highlights (id, title, is_active) values
  ('44444444-4444-4444-4444-444444444444', 'Teste RLS destaque inativo', false);

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
select pg_temp.tentar('anon.ve_categoria_inativa',  $q$select 1 from public.categories where id = '11111111-1111-1111-1111-111111111111'$q$);
select pg_temp.tentar('anon.ve_produto_cat_inativa', $q$select 1 from public.products where id = '22222222-2222-2222-2222-222222222222'$q$);
select pg_temp.tentar('anon.ve_produto_inativo',     $q$select 1 from public.products where id = '33333333-3333-3333-3333-333333333333'$q$);
select pg_temp.tentar('anon.ve_destaque_inativo',    $q$select 1 from public.highlights where id = '44444444-4444-4444-4444-444444444444'$q$);
select pg_temp.tentar('anon.le_loja',                $q$select 1 from public.store_settings$q$);
select pg_temp.tentar('anon.le_perfis',              $q$select 1 from public.profiles$q$);
select pg_temp.tentar('anon.le_auditoria',           $q$select 1 from public.audit_logs$q$);
select pg_temp.tentar('anon.insere_categoria',       $q$insert into public.categories (name, slug) values ('x', 'anon-x')$q$);
select pg_temp.tentar('anon.atualiza_produto',       $q$update public.products set price_cents = 1 where true$q$);
select pg_temp.tentar('anon.apaga_destaque',         $q$delete from public.highlights where true$q$);
select pg_temp.tentar('anon.atualiza_loja',          $q$update public.store_settings set notice = 'x' where id$q$);
select pg_temp.tentar('anon.storage_insere',         $q$insert into storage.objects (bucket_id, name) values ('product-images', 'teste/anon.webp')$q$);
select pg_temp.tentar('anon.is_admin',               $q$select private.is_admin()$q$);
reset role;

-- ===================== USUÁRIO COMUM =====================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar('comum.ve_produto_inativo',    $q$select 1 from public.products where id = '33333333-3333-3333-3333-333333333333'$q$);
select pg_temp.tentar('comum.le_perfis',             $q$select 1 from public.profiles$q$);
select pg_temp.tentar('comum.le_auditoria',          $q$select 1 from public.audit_logs$q$);
select pg_temp.tentar('comum.insere_categoria',      $q$insert into public.categories (name, slug) values ('x', 'comum-x')$q$);
select pg_temp.tentar('comum.atualiza_produto',      $q$update public.products set price_cents = 1 where true$q$);
select pg_temp.tentar('comum.apaga_produto',         $q$delete from public.products where id = '33333333-3333-3333-3333-333333333333'$q$);
select pg_temp.tentar('comum.atualiza_loja',         $q$update public.store_settings set notice = 'x' where id$q$);
select pg_temp.tentar('comum.insere_auditoria',      $q$insert into public.audit_logs (action, entity) values ('x', 'x')$q$);
select pg_temp.tentar('comum.se_promove_admin',      $q$insert into public.profiles (id, role, is_active) values ('00000000-0000-0000-0000-0000000000c0', 'admin', true)$q$);
select pg_temp.tentar('comum.storage_insere',        $q$insert into storage.objects (bucket_id, name) values ('product-videos', 'teste/comum.mp4')$q$);
select pg_temp.tentar('comum.is_admin',              $q$select 1 where private.is_admin()$q$);
reset role;

-- ===================== ADMIN =====================
select set_config('request.jwt.claims', '{"sub":"bae2a6b4-c6fd-4567-b01c-01c70e5d940a","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar('admin.is_admin',              $q$select 1 where private.is_admin()$q$);
select pg_temp.tentar('admin.ve_produto_inativo',    $q$select 1 from public.products where id = '33333333-3333-3333-3333-333333333333'$q$);
select pg_temp.tentar('admin.ve_categoria_inativa',  $q$select 1 from public.categories where id = '11111111-1111-1111-1111-111111111111'$q$);
select pg_temp.tentar('admin.insere_categoria',      $q$insert into public.categories (name, slug) values ('Teste RLS admin', 'teste-rls-admin')$q$);
select pg_temp.tentar('admin.atualiza_produto',      $q$update public.products set price_cents = 101 where id = '33333333-3333-3333-3333-333333333333'$q$);
select pg_temp.tentar('admin.apaga_destaque',        $q$delete from public.highlights where id = '44444444-4444-4444-4444-444444444444'$q$);
select pg_temp.tentar('admin.atualiza_loja',         $q$update public.store_settings set notice = 'teste rls' where id$q$);
select pg_temp.tentar('admin.le_perfis',             $q$select 1 from public.profiles where id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'$q$);
select pg_temp.tentar('admin.insere_auditoria',      $q$insert into public.audit_logs (actor_id, action, entity) values ('bae2a6b4-c6fd-4567-b01c-01c70e5d940a', 'teste', 'rls')$q$);
select pg_temp.tentar('admin.storage_insere',        $q$insert into storage.objects (bucket_id, name, owner_id) values ('highlight-images', 'teste/admin-rls.webp', 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a')$q$);
select pg_temp.tentar('admin.storage_lista',         $q$select 1 from storage.objects where name = 'teste/admin-rls.webp'$q$);
select pg_temp.tentar('admin.apaga_categoria_com_produtos', $q$delete from public.categories where id = '11111111-1111-1111-1111-111111111111'$q$);
reset role;

-- Listagem do objeto do admin por quem não é admin
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar('comum.storage_lista',         $q$select 1 from storage.objects where name = 'teste/admin-rls.webp'$q$);
reset role;
set local role anon;
select pg_temp.tentar('anon.storage_lista',          $q$select 1 from storage.objects where name = 'teste/admin-rls.webp'$q$);
reset role;

-- ===================== ESPERADOS =====================
-- 'ok:N' = executou e afetou/retornou N linhas; 'erro:XXXXX' = SQLSTATE esperado
-- 42501 = sem privilégio / violação de RLS no insert; 23503 = FK (categoria com produtos)
create temp table _e (k text primary key, v text) on commit drop;
insert into _e values
  ('anon.ve_categoria_inativa','ok:0'), ('anon.ve_produto_cat_inativa','ok:0'), ('anon.ve_produto_inativo','ok:0'),
  ('anon.ve_destaque_inativo','ok:0'), ('anon.le_loja','ok:1'), ('anon.le_perfis','erro:42501'),
  ('anon.le_auditoria','erro:42501'), ('anon.insere_categoria','erro:42501'), ('anon.atualiza_produto','erro:42501'),
  ('anon.apaga_destaque','erro:42501'), ('anon.atualiza_loja','erro:42501'), ('anon.storage_insere','erro:42501'),
  ('anon.is_admin','erro:42501'), ('anon.storage_lista','ok:0'),
  ('comum.ve_produto_inativo','ok:0'), ('comum.le_perfis','ok:0'), ('comum.le_auditoria','ok:0'),
  ('comum.insere_categoria','erro:42501'), ('comum.atualiza_produto','ok:0'), ('comum.apaga_produto','ok:0'),
  ('comum.atualiza_loja','ok:0'), ('comum.insere_auditoria','erro:42501'), ('comum.se_promove_admin','erro:42501'),
  ('comum.storage_insere','erro:42501'), ('comum.is_admin','ok:0'), ('comum.storage_lista','ok:0'),
  ('admin.is_admin','ok:1'), ('admin.ve_produto_inativo','ok:1'), ('admin.ve_categoria_inativa','ok:1'),
  ('admin.insere_categoria','ok:1'), ('admin.atualiza_produto','ok:1'), ('admin.apaga_destaque','ok:1'),
  ('admin.atualiza_loja','ok:1'), ('admin.le_perfis','ok:1'), ('admin.insere_auditoria','ok:1'),
  ('admin.storage_insere','ok:1'), ('admin.storage_lista','ok:1'), ('admin.apaga_categoria_com_produtos','erro:23503');

do $$
declare falhas text;
begin
  select string_agg(format('%s: esperado %s, obtido %s', e.k, e.v, coalesce(r.v, '(não executado)')), E'\n' order by e.k)
    into falhas
  from _e e left join _r r using (k)
  where r.v is distinct from e.v;
  if falhas is not null then
    raise exception E'FALHOU a regressão de RLS:\n%', falhas;
  end if;
  raise notice 'OK: % verificações de RLS passaram', (select count(*) from _e);
end $$;

select count(*) as verificacoes_ok from _e;

rollback;

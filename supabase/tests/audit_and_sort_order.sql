-- Auditoria transacional e posição inicial protegida contra concorrência.
-- Tudo acontece numa transação e termina em ROLLBACK.
-- ADMIN_ID = bae2a6b4-c6fd-4567-b01c-01c70e5d940a
-- COMUM_ID = 00000000-0000-0000-0000-0000000000c0

begin;

create temp table _r (k text primary key, v text) on commit drop;
create temp table _snapshots (k text primary key, metadata jsonb not null) on commit drop;
create temp table _positions (k text primary key, sort_order integer not null) on commit drop;
create temp table _counts (k text primary key, total bigint not null) on commit drop;
create temp table _store_before (notice text) on commit drop;
grant all on _r, _snapshots, _positions, _counts, _store_before to anon, authenticated;

-- Executa uma instrução e registra 'ok:<linhas>' ou 'erro:<sqlstate>'.
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

-- ===================== ADMIN =====================
select set_config('request.jwt.claims', '{"sub":"bae2a6b4-c6fd-4567-b01c-01c70e5d940a","role":"authenticated"}', true);
set local role authenticated;

insert into _positions
select 'categoria.antes', pg_catalog.coalesce(pg_catalog.max(sort_order), -1)
from public.categories;
insert into _positions
select 'destaque.antes', pg_catalog.coalesce(pg_catalog.max(sort_order), -1)
from public.highlights;

insert into public.categories (id, name, slug, sort_order) values
  ('a4100000-0000-4000-8000-000000000001', 'Teste auditoria categoria', 'teste-auditoria-categoria', 0);
insert into _snapshots
select 'create.category', pg_catalog.to_jsonb(categories) - 'created_at' - 'updated_at'
from public.categories where id = 'a4100000-0000-4000-8000-000000000001';

insert into public.products (id, category_id, name, price_cents, sort_order) values
  ('b4100000-0000-4000-8000-000000000001', 'a4100000-0000-4000-8000-000000000001', 'Teste auditoria base', 50, 0);
insert into _positions
select 'produto.antes', pg_catalog.max(sort_order)
from public.products where category_id = 'a4100000-0000-4000-8000-000000000001';
insert into public.products (id, category_id, name, price_cents, sort_order) values
  ('b4100000-0000-4000-8000-000000000002', 'a4100000-0000-4000-8000-000000000001', 'Teste auditoria produto', 100, 0);
insert into _snapshots
select 'create.product', pg_catalog.to_jsonb(products) - 'created_at' - 'updated_at'
from public.products where id = 'b4100000-0000-4000-8000-000000000002';

insert into public.highlights (id, title, sort_order) values
  ('c4100000-0000-4000-8000-000000000001', 'Teste auditoria destaque', 0);
insert into _snapshots
select 'create.highlight', pg_catalog.to_jsonb(highlights) - 'created_at' - 'updated_at'
from public.highlights where id = 'c4100000-0000-4000-8000-000000000001';

select pg_temp.tentar(
  'audit.create_category',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'create' and entity = 'category'
        and entity_id = 'a4100000-0000-4000-8000-000000000001'
        and metadata = (select metadata from _snapshots where k = 'create.category')$q$
);
select pg_temp.tentar(
  'audit.create_product',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'create' and entity = 'product'
        and entity_id = 'b4100000-0000-4000-8000-000000000002'
        and metadata = (select metadata from _snapshots where k = 'create.product')$q$
);
select pg_temp.tentar(
  'audit.create_highlight',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'create' and entity = 'highlight'
        and entity_id = 'c4100000-0000-4000-8000-000000000001'
        and metadata = (select metadata from _snapshots where k = 'create.highlight')$q$
);

select pg_temp.tentar(
  'ordem.categoria_no_fim',
  $q$select 1 from public.categories
      where id = 'a4100000-0000-4000-8000-000000000001'
        and sort_order = (select sort_order + 1 from _positions where k = 'categoria.antes')$q$
);
select pg_temp.tentar(
  'ordem.produto_no_fim',
  $q$select 1 from public.products
      where id = 'b4100000-0000-4000-8000-000000000002'
        and sort_order = (select sort_order + 1 from _positions where k = 'produto.antes')$q$
);
select pg_temp.tentar(
  'ordem.destaque_no_fim',
  $q$select 1 from public.highlights
      where id = 'c4100000-0000-4000-8000-000000000001'
        and sort_order = (select sort_order + 1 from _positions where k = 'destaque.antes')$q$
);

update public.products set price_cents = 175
where id = 'b4100000-0000-4000-8000-000000000002';
select pg_temp.tentar(
  'audit.update_price_only',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'update' and entity = 'product'
        and entity_id = 'b4100000-0000-4000-8000-000000000002'
        and metadata = '{"price_cents":{"de":100,"para":175}}'::jsonb$q$
);

insert into _counts
select 'produto.updates', pg_catalog.count(*) from public.audit_logs
where action = 'update' and entity = 'product'
  and entity_id = 'b4100000-0000-4000-8000-000000000002';
update public.products set price_cents = price_cents
where id = 'b4100000-0000-4000-8000-000000000002';
select pg_temp.tentar(
  'audit.noop_sem_linha',
  $q$select 1 where
      (select count(*) from public.audit_logs
       where action = 'update' and entity = 'product'
         and entity_id = 'b4100000-0000-4000-8000-000000000002')
      = (select total from _counts where k = 'produto.updates')$q$
);

insert into _store_before select notice from public.store_settings where id;
update public.store_settings set notice = 'Teste auditoria transacional' where id;
select pg_temp.tentar(
  'audit.update_store_settings',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'update' and entity = 'store_settings' and entity_id is null
        and metadata = pg_catalog.jsonb_build_object(
          'notice', pg_catalog.jsonb_build_object(
            'de', (select notice from _store_before),
            'para', 'Teste auditoria transacional'
          )
        )$q$
);

insert into _snapshots
select 'delete.product', pg_catalog.to_jsonb(products) - 'created_at' - 'updated_at'
from public.products where id = 'b4100000-0000-4000-8000-000000000002';
insert into _snapshots
select 'delete.category', pg_catalog.to_jsonb(categories) - 'created_at' - 'updated_at'
from public.categories where id = 'a4100000-0000-4000-8000-000000000001';
insert into _snapshots
select 'delete.highlight', pg_catalog.to_jsonb(highlights) - 'created_at' - 'updated_at'
from public.highlights where id = 'c4100000-0000-4000-8000-000000000001';

delete from public.products where id = 'b4100000-0000-4000-8000-000000000002';
delete from public.products where id = 'b4100000-0000-4000-8000-000000000001';
delete from public.categories where id = 'a4100000-0000-4000-8000-000000000001';
delete from public.highlights where id = 'c4100000-0000-4000-8000-000000000001';

select pg_temp.tentar(
  'audit.delete_product',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'delete' and entity = 'product'
        and entity_id = 'b4100000-0000-4000-8000-000000000002'
        and metadata = (select metadata from _snapshots where k = 'delete.product')$q$
);
select pg_temp.tentar(
  'audit.delete_category',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'delete' and entity = 'category'
        and entity_id = 'a4100000-0000-4000-8000-000000000001'
        and metadata = (select metadata from _snapshots where k = 'delete.category')$q$
);
select pg_temp.tentar(
  'audit.delete_highlight',
  $q$select 1 from public.audit_logs
      where actor_id = 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'
        and action = 'delete' and entity = 'highlight'
        and entity_id = 'c4100000-0000-4000-8000-000000000001'
        and metadata = (select metadata from _snapshots where k = 'delete.highlight')$q$
);

select pg_temp.tentar(
  'admin.insere_auditoria',
  $q$insert into public.audit_logs (actor_id, action, entity)
      values ('bae2a6b4-c6fd-4567-b01c-01c70e5d940a', 'teste', 'direto')$q$
);
reset role;

-- ===================== USUÁRIO COMUM E ANON =====================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar(
  'comum.insere_auditoria',
  $q$insert into public.audit_logs (action, entity) values ('teste', 'direto')$q$
);
reset role;

set local role anon;
select pg_temp.tentar('anon.le_auditoria', $q$select 1 from public.audit_logs$q$);
reset role;

-- ===================== ESPERADOS =====================
create temp table _e (k text primary key, v text) on commit drop;
insert into _e values
  ('audit.create_category', 'ok:1'),
  ('audit.create_product', 'ok:1'),
  ('audit.create_highlight', 'ok:1'),
  ('ordem.categoria_no_fim', 'ok:1'),
  ('ordem.produto_no_fim', 'ok:1'),
  ('ordem.destaque_no_fim', 'ok:1'),
  ('audit.update_price_only', 'ok:1'),
  ('audit.noop_sem_linha', 'ok:1'),
  ('audit.update_store_settings', 'ok:1'),
  ('audit.delete_product', 'ok:1'),
  ('audit.delete_category', 'ok:1'),
  ('audit.delete_highlight', 'ok:1'),
  ('admin.insere_auditoria', 'erro:42501'),
  ('comum.insere_auditoria', 'erro:42501'),
  ('anon.le_auditoria', 'erro:42501');

do $$
declare divergencias text;
begin
  select string_agg(
    format('%s: esperado %s, obtido %s', e.k, e.v, coalesce(r.v, '(não executado)')),
    E'\n' order by e.k
  )
  into divergencias
  from _e e left join _r r using (k)
  where r.v is distinct from e.v;

  if divergencias is not null then
    raise exception E'Auditoria e posição divergentes:\n%', divergencias;
  end if;
  raise notice 'OK: % verificações de auditoria e posição passaram', (select count(*) from _e);
end $$;

rollback;

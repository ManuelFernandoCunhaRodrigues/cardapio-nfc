-- Slugs públicos de produtos, geração automática e compatibilidade com RLS.
-- Tudo acontece numa transação e termina em ROLLBACK.
-- ADMIN_ID = bae2a6b4-c6fd-4567-b01c-01c70e5d940a

begin;

create temp table _r (k text primary key, v text) on commit drop;
grant all on _r to anon, authenticated;

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

select set_config('request.jwt.claims', '{"sub":"bae2a6b4-c6fd-4567-b01c-01c70e5d940a","role":"authenticated"}', true);
set local role authenticated;

insert into public.products (id, category_id, name, price_cents, created_at) values
  (
    '51000000-0000-4000-8000-000000000001',
    (select id from public.categories where slug = 'coxinhas'),
    'Pão de queijo!',
    100,
    '2026-10-14 15:01:00+00'
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    (select id from public.categories where slug = 'coxinhas'),
    'Pão de queijo!',
    100,
    '2026-10-14 15:02:00+00'
  );

select pg_temp.tentar(
  'gera_slug_sem_acento',
  $q$select 1 from public.products
      where id = '51000000-0000-4000-8000-000000000001'
        and slug = 'pao-de-queijo'$q$
);
select pg_temp.tentar(
  'repete_com_sufixo',
  $q$select 1 from public.products
      where id = '51000000-0000-4000-8000-000000000002'
        and slug = 'pao-de-queijo-2'$q$
);

update public.products set name = 'Nome alterado'
where id = '51000000-0000-4000-8000-000000000001';
select pg_temp.tentar(
  'renomear_preserva_slug',
  $q$select 1 from public.products
      where id = '51000000-0000-4000-8000-000000000001'
        and name = 'Nome alterado'
        and slug = 'pao-de-queijo'$q$
);

select pg_temp.tentar(
  'recusa_slug_maiusculo',
  $q$insert into public.products (category_id, name, slug, price_cents)
      select id, 'Slug maiúsculo', 'Slug-Maiusculo', 100
      from public.categories where slug = 'coxinhas'$q$
);
select pg_temp.tentar(
  'recusa_slug_com_espaco',
  $q$insert into public.products (category_id, name, slug, price_cents)
      select id, 'Slug com espaço', 'slug com espaco', 100
      from public.categories where slug = 'coxinhas'$q$
);
reset role;

set local role anon;
select pg_temp.tentar(
  'anon_le_slug_ativo',
  $q$select 1 from public.products
      where id = '51000000-0000-4000-8000-000000000001'
        and slug = 'pao-de-queijo'$q$
);
reset role;

create temp table _e (k text primary key, v text) on commit drop;
insert into _e values
  ('gera_slug_sem_acento', 'ok:1'),
  ('repete_com_sufixo', 'ok:1'),
  ('renomear_preserva_slug', 'ok:1'),
  ('recusa_slug_maiusculo', 'erro:23514'),
  ('recusa_slug_com_espaco', 'erro:23514'),
  ('anon_le_slug_ativo', 'ok:1');

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
    raise exception E'Slugs de produto divergentes:\n%', divergencias;
  end if;
  raise notice 'OK: % verificações de slug passaram', (select count(*) from _e);
end $$;

rollback;

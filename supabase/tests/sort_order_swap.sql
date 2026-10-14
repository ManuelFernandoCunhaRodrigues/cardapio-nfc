-- Troca atômica com posições iniciais atribuídas pelo trigger do banco.
-- Rodar inteiro como `postgres` (SQL Editor ou execute_sql). Tudo acontece numa
-- transação que termina em ROLLBACK: nenhum dado persiste.
-- Falha => RAISE EXCEPTION listando cada verificação divergente.
-- ADMIN_ID = bae2a6b4-c6fd-4567-b01c-01c70e5d940a (admin ativo do SALGAE-STAGING)
-- COMUM_ID = 00000000-0000-0000-0000-0000000000c0 (usuário autenticado sem perfil)

begin;

create temp table _r (k text primary key, v text) on commit drop;
create temp table _initial (
  kind text not null,
  id uuid not null,
  sort_order integer not null,
  primary key (kind, id)
) on commit drop;
grant all on _r, _initial to anon, authenticated;

-- Dados de teste (somem no rollback)
insert into public.categories (id, name, slug, sort_order) values
  ('a1111111-1111-4111-8111-111111111111', 'Teste troca A', 'teste-troca-a', 9001),
  ('a2222222-2222-4222-8222-222222222222', 'Teste troca B', 'teste-troca-b', 9002);
insert into public.products (id, category_id, name, price_cents, sort_order) values
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Teste troca P1', 100, 10),
  ('b2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 'Teste troca P2', 100, 20),
  ('b3333333-3333-4333-8333-333333333333', 'a2222222-2222-4222-8222-222222222222', 'Teste troca P3', 100, 30);
insert into public.highlights (id, title, sort_order) values
  ('c1111111-1111-4111-8111-111111111111', 'Teste troca D1', 9001),
  ('c2222222-2222-4222-8222-222222222222', 'Teste troca D2', 9002);

-- O trigger ignora as posições informadas; estas são as posições reais de partida.
insert into _initial
select 'category', id, sort_order from public.categories
where id in ('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')
union all
select 'product', id, sort_order from public.products
where id in (
  'b1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222',
  'b3333333-3333-4333-8333-333333333333'
)
union all
select 'highlight', id, sort_order from public.highlights
where id in ('c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222');

-- Executa uma instrução e registra 'ok:<linhas>' ou 'erro:<sqlstate>'.
-- O bloco com EXCEPTION desfaz o que a instrução tiver alterado antes de falhar.
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

select pg_temp.tentar(
  'ordem.posicoes_iniciais_distintas',
  $q$select 1 where
    (select count(distinct sort_order) from _initial where kind = 'category') = 2
    and (select count(distinct sort_order) from _initial
         where kind = 'product'
           and id in ('b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')) = 2
    and (select count(distinct sort_order) from _initial where kind = 'highlight') = 2$q$
);

-- Registra se todas as posições continuam iguais às capturadas após os inserts.
create function pg_temp.posicoes_inalteradas(chave text) returns void language sql as $$
  insert into _r
  select chave, case
    when pg_catalog.count(*) = 7
      and pg_catalog.count(*) filter (where initial.sort_order is distinct from current.sort_order) = 0
    then 'ok:1'
    else 'ok:0'
  end
  from _initial as initial
  left join (
    select 'category' as kind, id, sort_order from public.categories
    where id in ('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')
    union all
    select 'product', id, sort_order from public.products
    where id in (
      'b1111111-1111-4111-8111-111111111111',
      'b2222222-2222-4222-8222-222222222222',
      'b3333333-3333-4333-8333-333333333333'
    )
    union all
    select 'highlight', id, sort_order from public.highlights
    where id in ('c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222')
  ) as current using (kind, id)
  on conflict (k) do update set v = excluded.v;
$$;

-- ===================== VISITANTE (anon) =====================
set local role anon;
select pg_temp.tentar('anon.troca_produtos',   $q$select public.swap_product_sort_orders('b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('anon.troca_categorias', $q$select public.swap_category_sort_orders('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('anon.troca_destaques',  $q$select public.swap_highlight_sort_orders('c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222')$q$);
reset role;

-- ===================== USUÁRIO COMUM =====================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar('comum.troca_produtos',   $q$select public.swap_product_sort_orders('b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('comum.troca_categorias', $q$select public.swap_category_sort_orders('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('comum.troca_destaques',  $q$select public.swap_highlight_sort_orders('c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222')$q$);
reset role;
select pg_temp.posicoes_inalteradas('ordem.depois_de_anon_e_comum');

-- ===================== ADMIN =====================
select set_config('request.jwt.claims', '{"sub":"bae2a6b4-c6fd-4567-b01c-01c70e5d940a","role":"authenticated"}', true);
set local role authenticated;
-- Recusas: nenhuma pode deixar meia troca
select pg_temp.tentar('admin.troca_categorias_diferentes', $q$select public.swap_product_sort_orders('b1111111-1111-4111-8111-111111111111', 'b3333333-3333-4333-8333-333333333333')$q$);
select pg_temp.tentar('admin.troca_id_inexistente',        $q$select public.swap_product_sort_orders('b1111111-1111-4111-8111-111111111111', 'b9999999-9999-4999-8999-999999999999')$q$);
select pg_temp.tentar('admin.troca_mesmo_id',              $q$select public.swap_product_sort_orders('b1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111')$q$);
select pg_temp.tentar('admin.troca_categoria_inexistente', $q$select public.swap_category_sort_orders('a1111111-1111-4111-8111-111111111111', 'a9999999-9999-4999-8999-999999999999')$q$);
select pg_temp.tentar('admin.troca_destaque_inexistente',  $q$select public.swap_highlight_sort_orders('c1111111-1111-4111-8111-111111111111', 'c9999999-9999-4999-8999-999999999999')$q$);
reset role;
select pg_temp.posicoes_inalteradas('ordem.depois_das_recusas');

set local role authenticated;
select pg_temp.tentar('admin.troca_produtos',   $q$select public.swap_product_sort_orders('b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('admin.troca_categorias', $q$select public.swap_category_sort_orders('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('admin.troca_destaques',  $q$select public.swap_highlight_sort_orders('c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222')$q$);
reset role;
select pg_temp.tentar(
  'ordem.depois_da_troca',
  $q$select 1 where
    (select sort_order from public.products where id = 'b1111111-1111-4111-8111-111111111111')
      = (select sort_order from _initial where kind = 'product' and id = 'b2222222-2222-4222-8222-222222222222')
    and (select sort_order from public.products where id = 'b2222222-2222-4222-8222-222222222222')
      = (select sort_order from _initial where kind = 'product' and id = 'b1111111-1111-4111-8111-111111111111')
    and (select sort_order from public.products where id = 'b3333333-3333-4333-8333-333333333333')
      = (select sort_order from _initial where kind = 'product' and id = 'b3333333-3333-4333-8333-333333333333')$q$
);
select pg_temp.tentar(
  'ordem.categorias',
  $q$select 1 where
    (select sort_order from public.categories where id = 'a1111111-1111-4111-8111-111111111111')
      = (select sort_order from _initial where kind = 'category' and id = 'a2222222-2222-4222-8222-222222222222')
    and (select sort_order from public.categories where id = 'a2222222-2222-4222-8222-222222222222')
      = (select sort_order from _initial where kind = 'category' and id = 'a1111111-1111-4111-8111-111111111111')$q$
);
select pg_temp.tentar(
  'ordem.destaques',
  $q$select 1 where
    (select sort_order from public.highlights where id = 'c1111111-1111-4111-8111-111111111111')
      = (select sort_order from _initial where kind = 'highlight' and id = 'c2222222-2222-4222-8222-222222222222')
    and (select sort_order from public.highlights where id = 'c2222222-2222-4222-8222-222222222222')
      = (select sort_order from _initial where kind = 'highlight' and id = 'c1111111-1111-4111-8111-111111111111')$q$
);

-- ===================== CONFERÊNCIA =====================
do $$
declare
  esperado constant jsonb := '{
    "anon.troca_produtos": "erro:42501",
    "anon.troca_categorias": "erro:42501",
    "anon.troca_destaques": "erro:42501",
    "comum.troca_produtos": "erro:P0001",
    "comum.troca_categorias": "erro:P0001",
    "comum.troca_destaques": "erro:P0001",
    "ordem.posicoes_iniciais_distintas": "ok:1",
    "ordem.depois_de_anon_e_comum": "ok:1",
    "admin.troca_categorias_diferentes": "erro:P0001",
    "admin.troca_id_inexistente": "erro:P0001",
    "admin.troca_mesmo_id": "erro:P0001",
    "admin.troca_categoria_inexistente": "erro:P0001",
    "admin.troca_destaque_inexistente": "erro:P0001",
    "ordem.depois_das_recusas": "ok:1",
    "admin.troca_produtos": "ok:1",
    "admin.troca_categorias": "ok:1",
    "admin.troca_destaques": "ok:1",
    "ordem.depois_da_troca": "ok:1",
    "ordem.categorias": "ok:1",
    "ordem.destaques": "ok:1"
  }';
  divergencias text;
begin
  select string_agg(format('%s: esperado %s, veio %s', e.key, e.value, coalesce(r.v, '(nada)')), E'\n')
  into divergencias
  from jsonb_each_text(esperado) e left join _r r on r.k = e.key
  where r.v is distinct from e.value;
  if divergencias is not null then
    raise exception E'Troca de ordenação divergente:\n%', divergencias;
  end if;
end $$;

select k, v from _r order by k;

rollback;

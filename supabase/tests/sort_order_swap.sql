-- Troca atômica de ordenação (migration 20261013151000_atomic_sort_order_swap).
-- Rodar inteiro como `postgres` (SQL Editor ou execute_sql). Tudo acontece numa
-- transação que termina em ROLLBACK: nenhum dado persiste.
-- Falha => RAISE EXCEPTION listando cada verificação divergente.
-- ADMIN_ID = bae2a6b4-c6fd-4567-b01c-01c70e5d940a (admin ativo do SALGAE-STAGING)
-- COMUM_ID = 00000000-0000-0000-0000-0000000000c0 (usuário autenticado sem perfil)

begin;

create temp table _r (k text primary key, v text) on commit drop;
grant all on _r to anon, authenticated;

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

-- Registra a ordem atual dos três produtos de teste, como "P1,P2,P3".
create function pg_temp.ordem(chave text) returns void language sql as $$
  insert into _r
  select chave, string_agg(sort_order::text, ',' order by name)
  from public.products where name like 'Teste troca P%'
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
select pg_temp.ordem('ordem.depois_de_anon_e_comum');

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
select pg_temp.ordem('ordem.depois_das_recusas');

set local role authenticated;
select pg_temp.tentar('admin.troca_produtos',   $q$select public.swap_product_sort_orders('b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('admin.troca_categorias', $q$select public.swap_category_sort_orders('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')$q$);
select pg_temp.tentar('admin.troca_destaques',  $q$select public.swap_highlight_sort_orders('c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222')$q$);
reset role;
select pg_temp.ordem('ordem.depois_da_troca');
insert into _r select 'ordem.categorias', string_agg(sort_order::text, ',' order by name) from public.categories where name like 'Teste troca %';
insert into _r select 'ordem.destaques',  string_agg(sort_order::text, ',' order by title) from public.highlights where title like 'Teste troca %';

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
    "ordem.depois_de_anon_e_comum": "10,20,30",
    "admin.troca_categorias_diferentes": "erro:P0001",
    "admin.troca_id_inexistente": "erro:P0001",
    "admin.troca_mesmo_id": "erro:P0001",
    "admin.troca_categoria_inexistente": "erro:P0001",
    "admin.troca_destaque_inexistente": "erro:P0001",
    "ordem.depois_das_recusas": "10,20,30",
    "admin.troca_produtos": "ok:1",
    "admin.troca_categorias": "ok:1",
    "admin.troca_destaques": "ok:1",
    "ordem.depois_da_troca": "20,10,30",
    "ordem.categorias": "9002,9001",
    "ordem.destaques": "9002,9001"
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

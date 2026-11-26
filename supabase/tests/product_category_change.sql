-- Trocar a categoria de um produto o coloca no fim da categoria nova, sem repetir posição.
-- Rodar inteiro como `postgres`. Tudo acontece numa transação que termina em ROLLBACK.
-- Falha => RAISE EXCEPTION listando cada verificação divergente.
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

-- ===================== ADMIN =====================
select set_config('request.jwt.claims', '{"sub":"bae2a6b4-c6fd-4567-b01c-01c70e5d940a","role":"authenticated"}', true);
set local role authenticated;

-- Categoria A com posições 0, 1, 2 e categoria B com 0, 1 (atribuídas pelo gatilho de criação).
insert into public.categories (id, name, slug) values
  ('a7100000-0000-4000-8000-000000000001', 'Teste troca categoria A', 'teste-troca-categoria-a'),
  ('a7100000-0000-4000-8000-000000000002', 'Teste troca categoria B', 'teste-troca-categoria-b');
insert into public.products (id, category_id, name, price_cents) values
  ('b7100000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', 'Teste A0', 100);
insert into public.products (id, category_id, name, price_cents) values
  ('b7100000-0000-4000-8000-000000000002', 'a7100000-0000-4000-8000-000000000001', 'Teste A1', 100);
insert into public.products (id, category_id, name, price_cents) values
  ('b7100000-0000-4000-8000-000000000003', 'a7100000-0000-4000-8000-000000000001', 'Teste A2', 100);
insert into public.products (id, category_id, name, price_cents) values
  ('b7100000-0000-4000-8000-000000000004', 'a7100000-0000-4000-8000-000000000002', 'Teste B0', 100);
insert into public.products (id, category_id, name, price_cents) values
  ('b7100000-0000-4000-8000-000000000005', 'a7100000-0000-4000-8000-000000000002', 'Teste B1', 100);

select pg_temp.tentar(
  'ordem.posicoes_iniciais',
  $q$select 1 where
    (select array_agg(sort_order order by sort_order) from public.products
     where category_id = 'a7100000-0000-4000-8000-000000000001') = array[0, 1, 2]
    and (select array_agg(sort_order order by sort_order) from public.products
     where category_id = 'a7100000-0000-4000-8000-000000000002') = array[0, 1]$q$
);

-- B1 (posição 1) vai para A, que já tem um produto na posição 1.
select pg_temp.tentar(
  'admin.troca_categoria',
  $q$update public.products set category_id = 'a7100000-0000-4000-8000-000000000001'
     where id = 'b7100000-0000-4000-8000-000000000005'$q$
);
select pg_temp.tentar(
  'ordem.vai_para_o_fim',
  $q$select 1 from public.products
     where id = 'b7100000-0000-4000-8000-000000000005' and sort_order = 3$q$
);
select pg_temp.tentar(
  'ordem.sem_posicao_repetida',
  $q$select 1 where
    (select count(*) = count(distinct sort_order) from public.products
     where category_id = 'a7100000-0000-4000-8000-000000000001')$q$
);

-- Reenviar a mesma categoria (como o formulário faz ao salvar) não mexe na posição.
select pg_temp.tentar(
  'admin.salva_sem_trocar_categoria',
  $q$update public.products
     set name = 'Teste A0 renomeado', category_id = 'a7100000-0000-4000-8000-000000000001'
     where id = 'b7100000-0000-4000-8000-000000000001'$q$
);
select pg_temp.tentar(
  'ordem.mantida_sem_troca',
  $q$select 1 from public.products
     where id = 'b7100000-0000-4000-8000-000000000001' and sort_order = 0$q$
);

-- Depois da troca de categoria, subir o produto movido de fato muda a ordem.
select pg_temp.tentar(
  'admin.sobe_produto_movido',
  $q$select public.swap_product_sort_orders(
       'b7100000-0000-4000-8000-000000000005', 'b7100000-0000-4000-8000-000000000003')$q$
);
select pg_temp.tentar(
  'ordem.troca_depois_de_mover',
  $q$select 1 where
    (select sort_order from public.products where id = 'b7100000-0000-4000-8000-000000000005') = 2
    and (select sort_order from public.products where id = 'b7100000-0000-4000-8000-000000000003') = 3$q$
);
reset role;

-- ===================== CONFERÊNCIA =====================
do $$
declare
  esperado constant jsonb := '{
    "ordem.posicoes_iniciais": "ok:1",
    "admin.troca_categoria": "ok:1",
    "ordem.vai_para_o_fim": "ok:1",
    "ordem.sem_posicao_repetida": "ok:1",
    "admin.salva_sem_trocar_categoria": "ok:1",
    "ordem.mantida_sem_troca": "ok:1",
    "admin.sobe_produto_movido": "ok:1",
    "ordem.troca_depois_de_mover": "ok:1"
  }';
  divergencias text;
begin
  select string_agg(format('%s: esperado %s, veio %s', e.key, e.value, coalesce(r.v, '(nada)')), E'\n')
  into divergencias
  from jsonb_each_text(esperado) e left join _r r on r.k = e.key
  where r.v is distinct from e.value;
  if divergencias is not null then
    raise exception E'Troca de categoria divergente:\n%', divergencias;
  end if;
  raise notice 'OK: % verificações de troca de categoria passaram', (select count(*) from jsonb_object_keys(esperado));
end $$;

select k, v from _r order by k;

rollback;

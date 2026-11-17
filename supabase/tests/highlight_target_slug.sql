-- Destino dos destaques acompanha a troca de slug da categoria e do produto.
-- Tudo acontece numa transação e termina em ROLLBACK.
-- ADMIN_ID = bae2a6b4-c6fd-4567-b01c-01c70e5d940a
-- COMUM_ID = 00000000-0000-0000-0000-0000000000c0

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

insert into public.categories (id, name, slug) values
  ('a5100000-0000-4000-8000-000000000001', 'Destino categoria', 'destino-categoria'),
  ('a5100000-0000-4000-8000-000000000002', 'Outra categoria', 'outra-categoria'),
  ('a5100000-0000-4000-8000-000000000003', 'Destino categoria extra', 'destino-categoria-extra');
insert into public.products (id, category_id, name, slug, price_cents) values
  (
    'a5100000-0000-4000-8000-000000000011',
    'a5100000-0000-4000-8000-000000000001',
    'Destino produto',
    'destino-produto',
    100
  ),
  (
    'a5100000-0000-4000-8000-000000000012',
    'a5100000-0000-4000-8000-000000000001',
    'Destino produto extra',
    'destino-produto-extra',
    100
  ),
  (
    'a5100000-0000-4000-8000-000000000013',
    'a5100000-0000-4000-8000-000000000001',
    'Produto legado',
    'produto-legado',
    100
  );
insert into public.highlights (id, title, target) values
  ('a5100000-0000-4000-8000-000000000021', 'Leva à categoria', '/cardapio#destino-categoria'),
  ('a5100000-0000-4000-8000-000000000022', 'Leva ao produto', '/produto/destino-produto'),
  ('a5100000-0000-4000-8000-000000000023', 'Leva a outra categoria', '/cardapio#outra-categoria'),
  ('a5100000-0000-4000-8000-000000000024', 'Leva para fora', 'https://exemplo.com/destino-categoria'),
  -- Slugs que começam igual ao que muda: não podem ser alcançados pela troca.
  ('a5100000-0000-4000-8000-000000000025', 'Leva à categoria extra', '/cardapio#destino-categoria-extra'),
  ('a5100000-0000-4000-8000-000000000026', 'Leva ao produto extra', '/produto/destino-produto-extra'),
  -- Destaque antigo, gravado com o id do produto.
  ('a5100000-0000-4000-8000-000000000027', 'Destaque legado', '/produto/a5100000-0000-4000-8000-000000000013');

update public.categories set name = 'Destino renomeado'
where id = 'a5100000-0000-4000-8000-000000000001';
select pg_temp.tentar(
  'renomear_sem_trocar_slug_mantem_destino',
  $q$select 1 from public.highlights
      where id = 'a5100000-0000-4000-8000-000000000021'
        and target = '/cardapio#destino-categoria'$q$
);

update public.categories set slug = 'categoria-nova'
where id = 'a5100000-0000-4000-8000-000000000001';
select pg_temp.tentar(
  'slug_da_categoria_atualiza_destaque',
  $q$select 1 from public.highlights
      where id = 'a5100000-0000-4000-8000-000000000021'
        and target = '/cardapio#categoria-nova'$q$
);

update public.products set slug = 'produto-novo'
where id = 'a5100000-0000-4000-8000-000000000011';
select pg_temp.tentar(
  'slug_do_produto_atualiza_destaque',
  $q$select 1 from public.highlights
      where id = 'a5100000-0000-4000-8000-000000000022'
        and target = '/produto/produto-novo'$q$
);

select pg_temp.tentar(
  'outros_destaques_nao_mudam',
  $q$select 1 from public.highlights
      where (id = 'a5100000-0000-4000-8000-000000000023' and target = '/cardapio#outra-categoria')
         or (id = 'a5100000-0000-4000-8000-000000000024'
             and target = 'https://exemplo.com/destino-categoria')
         or (id = 'a5100000-0000-4000-8000-000000000025'
             and target = '/cardapio#destino-categoria-extra')
         or (id = 'a5100000-0000-4000-8000-000000000026'
             and target = '/produto/destino-produto-extra')$q$
);
reset role;

-- ===================== USUÁRIO COMUM =====================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.tentar(
  'comum.troca_slug_da_categoria',
  $q$update public.categories set slug = 'comum-mudou'
      where id = 'a5100000-0000-4000-8000-000000000001'$q$
);
select pg_temp.tentar(
  'comum.troca_slug_do_produto',
  $q$update public.products set slug = 'comum-mudou'
      where id = 'a5100000-0000-4000-8000-000000000011'$q$
);
select pg_temp.tentar(
  'comum.chama_gatilho_categoria',
  $q$select private.follow_category_slug_in_highlights()$q$
);
select pg_temp.tentar(
  'comum.chama_gatilho_produto',
  $q$select private.follow_product_slug_in_highlights()$q$
);
select pg_temp.tentar(
  'comum.chama_conversao_legada',
  $q$select private.highlight_targets_use_product_slug()$q$
);
reset role;

select pg_temp.tentar(
  'comum.nada_mudou',
  $q$select 1 from public.highlights
      where (id = 'a5100000-0000-4000-8000-000000000021' and target = '/cardapio#categoria-nova')
         or (id = 'a5100000-0000-4000-8000-000000000022' and target = '/produto/produto-novo')$q$
);

-- ===================== CONVERSÃO DOS DESTAQUES ANTIGOS =====================
-- A primeira rodada converte ao menos o destaque deste teste; a segunda não encontra mais nada.
-- A auditoria grava auth.uid(); o usuário comum não existe em auth.users, então volta o admin.
select set_config('request.jwt.claims', '{"sub":"bae2a6b4-c6fd-4567-b01c-01c70e5d940a","role":"authenticated"}', true);
insert into _r
select 'conversao_primeira_vez', case when private.highlight_targets_use_product_slug() >= 1 then 'ok' else 'nada' end;
select pg_temp.tentar(
  'conversao_usa_o_slug',
  $q$select 1 from public.highlights
      where id = 'a5100000-0000-4000-8000-000000000027'
        and target = '/produto/produto-legado'$q$
);
insert into _r
select 'conversao_segunda_vez', 'mudou:' || private.highlight_targets_use_product_slug();

-- ===================== ESPERADOS =====================
create temp table _e (k text primary key, v text) on commit drop;
insert into _e values
  ('renomear_sem_trocar_slug_mantem_destino', 'ok:1'),
  ('slug_da_categoria_atualiza_destaque', 'ok:1'),
  ('slug_do_produto_atualiza_destaque', 'ok:1'),
  ('outros_destaques_nao_mudam', 'ok:4'),
  ('comum.troca_slug_da_categoria', 'ok:0'),
  ('comum.troca_slug_do_produto', 'ok:0'),
  ('comum.chama_gatilho_categoria', 'erro:42501'),
  ('comum.chama_gatilho_produto', 'erro:42501'),
  ('comum.chama_conversao_legada', 'erro:42501'),
  ('comum.nada_mudou', 'ok:2'),
  ('conversao_primeira_vez', 'ok'),
  ('conversao_usa_o_slug', 'ok:1'),
  ('conversao_segunda_vez', 'mudou:0');

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
    raise exception E'Destinos de destaque divergentes:\n%', divergencias;
  end if;
  raise notice 'OK: % verificações de destino passaram', (select count(*) from _e);
end $$;

rollback;

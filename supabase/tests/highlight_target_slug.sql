-- Destino dos destaques acompanha a troca de slug da categoria e do produto.
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

insert into public.categories (id, name, slug) values
  ('a5100000-0000-4000-8000-000000000001', 'Destino categoria', 'destino-categoria'),
  ('a5100000-0000-4000-8000-000000000002', 'Outra categoria', 'outra-categoria');
insert into public.products (id, category_id, name, slug, price_cents) values
  (
    'a5100000-0000-4000-8000-000000000011',
    'a5100000-0000-4000-8000-000000000001',
    'Destino produto',
    'destino-produto',
    100
  );
insert into public.highlights (id, title, target) values
  ('a5100000-0000-4000-8000-000000000021', 'Leva à categoria', '/cardapio#destino-categoria'),
  ('a5100000-0000-4000-8000-000000000022', 'Leva ao produto', '/produto/destino-produto'),
  ('a5100000-0000-4000-8000-000000000023', 'Leva a outra categoria', '/cardapio#outra-categoria'),
  ('a5100000-0000-4000-8000-000000000024', 'Leva para fora', 'https://exemplo.com/destino-categoria');

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
select pg_temp.tentar(
  'outros_destaques_nao_mudam',
  $q$select 1 from public.highlights
      where (id = 'a5100000-0000-4000-8000-000000000023' and target = '/cardapio#outra-categoria')
         or (id = 'a5100000-0000-4000-8000-000000000024'
             and target = 'https://exemplo.com/destino-categoria')$q$
);

update public.products set slug = 'produto-novo'
where id = 'a5100000-0000-4000-8000-000000000011';
select pg_temp.tentar(
  'slug_do_produto_atualiza_destaque',
  $q$select 1 from public.highlights
      where id = 'a5100000-0000-4000-8000-000000000022'
        and target = '/produto/produto-novo'$q$
);
reset role;

create temp table _e (k text primary key, v text) on commit drop;
insert into _e values
  ('renomear_sem_trocar_slug_mantem_destino', 'ok:1'),
  ('slug_da_categoria_atualiza_destaque', 'ok:1'),
  ('outros_destaques_nao_mudam', 'ok:2'),
  ('slug_do_produto_atualiza_destaque', 'ok:1');

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

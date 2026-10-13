-- Trocas de ordenação atômicas, mantendo a autorização nas policies de RLS.

create or replace function public.swap_product_sort_orders(p_source_id pg_catalog.uuid, p_neighbor_id pg_catalog.uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  with selected as materialized (
    select products.id, products.category_id, products.sort_order
    from public.products
    where products.id in (p_source_id, p_neighbor_id)
    for update
  )
  update public.products as products
  set sort_order = case products.id
    when p_source_id then (select selected.sort_order from selected where selected.id = p_neighbor_id)
    when p_neighbor_id then (select selected.sort_order from selected where selected.id = p_source_id)
  end
  where products.id in (p_source_id, p_neighbor_id)
    and (select count(*) from selected) = 2
    and (select count(distinct selected.category_id) from selected) = 1;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 2 then
    raise exception 'Não foi possível trocar a ordem dos produtos';
  end if;
end;
$$;

create or replace function public.swap_category_sort_orders(p_source_id pg_catalog.uuid, p_neighbor_id pg_catalog.uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  with selected as materialized (
    select categories.id, categories.sort_order
    from public.categories
    where categories.id in (p_source_id, p_neighbor_id)
    for update
  )
  update public.categories as categories
  set sort_order = case categories.id
    when p_source_id then (select selected.sort_order from selected where selected.id = p_neighbor_id)
    when p_neighbor_id then (select selected.sort_order from selected where selected.id = p_source_id)
  end
  where categories.id in (p_source_id, p_neighbor_id)
    and (select count(*) from selected) = 2;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 2 then
    raise exception 'Não foi possível trocar a ordem das categorias';
  end if;
end;
$$;

create or replace function public.swap_highlight_sort_orders(p_source_id pg_catalog.uuid, p_neighbor_id pg_catalog.uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  with selected as materialized (
    select highlights.id, highlights.sort_order
    from public.highlights
    where highlights.id in (p_source_id, p_neighbor_id)
    for update
  )
  update public.highlights as highlights
  set sort_order = case highlights.id
    when p_source_id then (select selected.sort_order from selected where selected.id = p_neighbor_id)
    when p_neighbor_id then (select selected.sort_order from selected where selected.id = p_source_id)
  end
  where highlights.id in (p_source_id, p_neighbor_id)
    and (select count(*) from selected) = 2;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 2 then
    raise exception 'Não foi possível trocar a ordem dos destaques';
  end if;
end;
$$;

revoke all on function public.swap_product_sort_orders(pg_catalog.uuid, pg_catalog.uuid) from public, anon;
revoke all on function public.swap_category_sort_orders(pg_catalog.uuid, pg_catalog.uuid) from public, anon;
revoke all on function public.swap_highlight_sort_orders(pg_catalog.uuid, pg_catalog.uuid) from public, anon;

grant execute on function public.swap_product_sort_orders(pg_catalog.uuid, pg_catalog.uuid) to authenticated;
grant execute on function public.swap_category_sort_orders(pg_catalog.uuid, pg_catalog.uuid) to authenticated;
grant execute on function public.swap_highlight_sort_orders(pg_catalog.uuid, pg_catalog.uuid) to authenticated;

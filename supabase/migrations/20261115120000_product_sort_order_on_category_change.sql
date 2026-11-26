-- Trocar a categoria de um produto passa a levá-lo para o fim da categoria nova. Antes ele mantinha
-- a posição antiga, que podia repetir a de outro produto da categoria nova; com o empate, a troca
-- de posições entre os dois respondia sucesso sem mover nada.

create or replace function private.move_product_to_category_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Mesmo escopo de lock de private.assign_sort_order: uma criação e uma troca de categoria
  -- simultâneas não escolhem a mesma posição.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('products:' || new.category_id::text, 0)
  );
  select coalesce(pg_catalog.max(products.sort_order), -1) + 1
  into new.sort_order
  from public.products
  where products.category_id = new.category_id;

  return new;
end;
$$;

alter function private.move_product_to_category_end() owner to postgres;
revoke all on function private.move_product_to_category_end() from public;

-- O formulário sempre reenvia category_id; o WHEN evita mexer na posição quando ela não mudou.
create trigger products_move_to_category_end
before update of category_id on public.products
for each row
when (old.category_id is distinct from new.category_id)
execute function private.move_product_to_category_end();

-- Desfaz os empates que a falha já deixou, só nas categorias afetadas, mantendo a ordem que o
-- painel mostra (posição e depois nome).
with categories_with_ties as (
  select category_id
  from public.products
  group by category_id
  having pg_catalog.count(*) <> pg_catalog.count(distinct sort_order)
),
renumbered as (
  select
    products.id,
    (pg_catalog.row_number() over (
      partition by products.category_id
      order by products.sort_order, products.name, products.id
    ) - 1)::integer as position
  from public.products
  join categories_with_ties using (category_id)
)
update public.products
set sort_order = renumbered.position
from renumbered
where products.id = renumbered.id
  and products.sort_order is distinct from renumbered.position;

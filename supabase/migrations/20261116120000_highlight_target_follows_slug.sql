-- O destaque guarda o destino pelo endereço público: /cardapio#<slug da categoria> ou
-- /produto/<slug do produto>. Se esse slug mudar, o banner passaria a levar a lugar nenhum. Estes
-- gatilhos atualizam o destino dos destaques na mesma transação da troca de slug.

create or replace function private.follow_category_slug_in_highlights()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.highlights
  set target = '/cardapio#' || new.slug
  where target = '/cardapio#' || old.slug;
  return null;
end;
$$;

alter function private.follow_category_slug_in_highlights() owner to postgres;
revoke all on function private.follow_category_slug_in_highlights() from public;

create trigger categories_follow_slug_in_highlights
after update of slug on public.categories
for each row
when (old.slug is distinct from new.slug)
execute function private.follow_category_slug_in_highlights();

create or replace function private.follow_product_slug_in_highlights()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.highlights
  set target = '/produto/' || new.slug
  where target = '/produto/' || old.slug;
  return null;
end;
$$;

alter function private.follow_product_slug_in_highlights() owner to postgres;
revoke all on function private.follow_product_slug_in_highlights() from public;

create trigger products_follow_slug_in_highlights
after update of slug on public.products
for each row
when (old.slug is distinct from new.slug)
execute function private.follow_product_slug_in_highlights();

-- Destaques antigos apontavam para /produto/<id>. A página pública ainda aceita o id e redireciona,
-- mas o redirecionamento extra atrapalha o botão Voltar: passam a apontar direto para o slug.
-- Função à parte para o teste conferir que rodar de novo não muda nada. Devolve quantos mudaram.
create or replace function private.highlight_targets_use_product_slug()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.highlights
  set target = '/produto/' || products.slug
  from public.products
  where highlights.target = '/produto/' || products.id::text;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

alter function private.highlight_targets_use_product_slug() owner to postgres;
revoke all on function private.highlight_targets_use_product_slug() from public;

select private.highlight_targets_use_product_slug();

-- Endereço do produto pelo nome (/produto/coxinha-de-frango). O slug nasce do nome na criação e
-- não muda quando o produto é renomeado, para links compartilhados continuarem valendo.

alter table public.products
add column slug text
check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create or replace function private.product_slug_base(product_name text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(
      pg_catalog.btrim(
        pg_catalog.regexp_replace(
          pg_catalog.translate(
            pg_catalog.lower(product_name),
            'áàâãäéèêëíìîïóòôõöúùûüç',
            'aaaaaeeeeiiiiooooouuuuc'
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '-'
      ),
      ''
    ),
    'produto'
  );
$$;

alter function private.product_slug_base(text) owner to postgres;
revoke all on function private.product_slug_base(text) from public;

do $$
declare
  product record;
  base_slug text;
  candidate_slug text;
  suffix integer;
begin
  for product in
    select id, name
    from public.products
    order by created_at, id
  loop
    base_slug := private.product_slug_base(product.name);
    candidate_slug := base_slug;
    suffix := 2;

    while exists (select 1 from public.products where slug = candidate_slug) loop
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    end loop;

    update public.products set slug = candidate_slug where id = product.id;
  end loop;
end;
$$;

alter table public.products alter column slug set not null;
create unique index products_slug_idx on public.products (slug);

create or replace function private.assign_product_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 2;
begin
  if new.slug is not null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('products:slug', 0)
  );

  base_slug := private.product_slug_base(new.name);
  candidate_slug := base_slug;

  while exists (select 1 from public.products where slug = candidate_slug) loop
    candidate_slug := base_slug || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate_slug;
  return new;
end;
$$;

alter function private.assign_product_slug() owner to postgres;
revoke all on function private.assign_product_slug() from public;

create trigger products_assign_slug
before insert on public.products
for each row execute function private.assign_product_slug();

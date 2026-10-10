-- Fundação do cardápio local Salgaê. Execute via Supabase CLI no ambiente correto.
-- Esta migration não cria usuários nem promove administradores automaticamente.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_path text,
  video_path text null check (video_path is null or image_path is not null),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  image_path text,
  target text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'admin' check (role in ('admin')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(trim(action)) > 0),
  entity text not null check (char_length(trim(entity)) > 0),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index categories_sort_order_idx on public.categories (sort_order);
create index products_category_id_idx on public.products (category_id);
create index products_sort_order_idx on public.products (sort_order);
create index highlights_sort_order_idx on public.highlights (sort_order);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger highlights_set_updated_at before update on public.highlights
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
revoke all on function public.set_updated_at() from public;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.highlights enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

-- Os GRANTs tornam as tabelas acessíveis pela Data API em projetos novos.
grant select on public.categories, public.products, public.highlights to anon, authenticated;
grant select, insert, update, delete on public.categories, public.products, public.highlights to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert on public.audit_logs to authenticated;

create policy "leitura pública de categorias ativas"
on public.categories for select to anon, authenticated
using (is_active = true);
create policy "admin administra categorias"
on public.categories for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "leitura pública de produtos ativos"
on public.products for select to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.categories
    where categories.id = products.category_id and categories.is_active = true
  )
);
create policy "admin administra produtos"
on public.products for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "leitura pública de destaques ativos"
on public.highlights for select to anon, authenticated
using (is_active = true);
create policy "admin administra destaques"
on public.highlights for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "usuário lê o próprio perfil"
on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy "admin lê perfis"
on public.profiles for select to authenticated
using ((select public.is_admin()));
create policy "admin administra perfis"
on public.profiles for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admin lê auditoria"
on public.audit_logs for select to authenticated
using ((select public.is_admin()));
create policy "admin insere auditoria"
on public.audit_logs for insert to authenticated
with check ((select public.is_admin()));

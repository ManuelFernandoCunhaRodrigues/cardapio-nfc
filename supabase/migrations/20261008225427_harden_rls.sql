-- Endurecimento de RLS e privilégios. Aplicar primeiro em homologação.

-- A função administrativa fica fora dos schemas expostos pela Data API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
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

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Reduz privilégios de tabela; o RLS continua sendo a autorização final.
revoke all privileges on table public.profiles, public.audit_logs from anon;
revoke insert, update, delete, truncate, references, trigger
on table public.categories, public.products, public.highlights from anon;
revoke truncate, references, trigger
on table public.categories, public.products, public.highlights, public.profiles from authenticated;
revoke all privileges on table public.audit_logs from authenticated;
grant select, insert on table public.audit_logs to authenticated;

-- Tabelas futuras de public não recebem escrita para anon por padrão.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;

-- As policies antigas dependem de public.is_admin().
drop policy if exists "leitura pública de categorias ativas" on public.categories;
drop policy if exists "admin administra categorias" on public.categories;
drop policy if exists "leitura anon de categorias ativas" on public.categories;
drop policy if exists "leitura autenticada de categorias" on public.categories;
drop policy if exists "admin insere categorias" on public.categories;
drop policy if exists "admin atualiza categorias" on public.categories;
drop policy if exists "admin remove categorias" on public.categories;

drop policy if exists "leitura pública de produtos ativos" on public.products;
drop policy if exists "admin administra produtos" on public.products;
drop policy if exists "leitura anon de produtos ativos" on public.products;
drop policy if exists "leitura autenticada de produtos" on public.products;
drop policy if exists "admin insere produtos" on public.products;
drop policy if exists "admin atualiza produtos" on public.products;
drop policy if exists "admin remove produtos" on public.products;

drop policy if exists "leitura pública de destaques ativos" on public.highlights;
drop policy if exists "admin administra destaques" on public.highlights;
drop policy if exists "leitura anon de destaques ativos" on public.highlights;
drop policy if exists "leitura autenticada de destaques" on public.highlights;
drop policy if exists "admin insere destaques" on public.highlights;
drop policy if exists "admin atualiza destaques" on public.highlights;
drop policy if exists "admin remove destaques" on public.highlights;

drop policy if exists "usuário lê o próprio perfil" on public.profiles;
drop policy if exists "admin lê perfis" on public.profiles;
drop policy if exists "admin administra perfis" on public.profiles;
drop policy if exists "autenticado lê o próprio perfil ou todos como admin" on public.profiles;
drop policy if exists "admin insere perfis" on public.profiles;
drop policy if exists "admin atualiza perfis" on public.profiles;
drop policy if exists "admin remove perfis" on public.profiles;

drop policy if exists "admin lê auditoria" on public.audit_logs;
drop policy if exists "admin insere auditoria" on public.audit_logs;

-- Uma única policy permissiva por papel, tabela e ação.
create policy "leitura anon de categorias ativas"
on public.categories for select to anon
using (is_active = true);
create policy "leitura autenticada de categorias"
on public.categories for select to authenticated
using (is_active = true or (select private.is_admin()));
create policy "admin insere categorias"
on public.categories for insert to authenticated
with check ((select private.is_admin()));
create policy "admin atualiza categorias"
on public.categories for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy "admin remove categorias"
on public.categories for delete to authenticated
using ((select private.is_admin()));

create policy "leitura anon de produtos ativos"
on public.products for select to anon
using (
  is_active = true
  and exists (
    select 1 from public.categories
    where categories.id = products.category_id and categories.is_active = true
  )
);
create policy "leitura autenticada de produtos"
on public.products for select to authenticated
using (
  (
    is_active = true
    and exists (
      select 1 from public.categories
      where categories.id = products.category_id and categories.is_active = true
    )
  )
  or (select private.is_admin())
);
create policy "admin insere produtos"
on public.products for insert to authenticated
with check ((select private.is_admin()));
create policy "admin atualiza produtos"
on public.products for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy "admin remove produtos"
on public.products for delete to authenticated
using ((select private.is_admin()));

create policy "leitura anon de destaques ativos"
on public.highlights for select to anon
using (is_active = true);
create policy "leitura autenticada de destaques"
on public.highlights for select to authenticated
using (is_active = true or (select private.is_admin()));
create policy "admin insere destaques"
on public.highlights for insert to authenticated
with check ((select private.is_admin()));
create policy "admin atualiza destaques"
on public.highlights for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy "admin remove destaques"
on public.highlights for delete to authenticated
using ((select private.is_admin()));

create policy "autenticado lê o próprio perfil ou todos como admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy "admin insere perfis"
on public.profiles for insert to authenticated
with check ((select private.is_admin()));
create policy "admin atualiza perfis"
on public.profiles for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy "admin remove perfis"
on public.profiles for delete to authenticated
using ((select private.is_admin()));

create policy "admin lê auditoria"
on public.audit_logs for select to authenticated
using ((select private.is_admin()));
create policy "admin insere auditoria"
on public.audit_logs for insert to authenticated
with check ((select private.is_admin()));

drop function if exists public.is_admin();

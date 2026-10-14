-- Auditoria e posição inicial passam a fazer parte da mesma transação da mutação.

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  audit_action text;
  audit_entity text;
  audit_entity_id uuid;
  audit_metadata jsonb;
begin
  old_row := case when tg_op in ('UPDATE', 'DELETE') then pg_catalog.to_jsonb(old) end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then pg_catalog.to_jsonb(new) end;

  audit_entity := case tg_table_name
    when 'categories' then 'category'
    when 'products' then 'product'
    when 'highlights' then 'highlight'
    when 'store_settings' then 'store_settings'
    else null
  end;

  if audit_entity is null then
    raise exception 'Tabela sem entidade de auditoria: %', tg_table_name;
  end if;

  if tg_table_name <> 'store_settings' then
    audit_entity_id := ((case when tg_op = 'DELETE' then old_row else new_row end) ->> 'id')::uuid;
  end if;

  if tg_op = 'INSERT' then
    audit_action := 'create';
    audit_metadata := new_row - 'created_at' - 'updated_at';
  elsif tg_op = 'UPDATE' then
    audit_action := 'update';
    select coalesce(
      pg_catalog.jsonb_object_agg(
        changed.key,
        pg_catalog.jsonb_build_object('de', old_row -> changed.key, 'para', changed.value)
      ),
      '{}'::jsonb
    )
    into audit_metadata
    from pg_catalog.jsonb_each(new_row - 'updated_at') as changed
    where old_row -> changed.key is distinct from changed.value;

    -- O trigger de updated_at não deve criar ruído sozinho.
    if audit_metadata = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    audit_action := 'delete';
    audit_metadata := old_row - 'created_at' - 'updated_at';
  else
    raise exception 'Operação sem auditoria: %', tg_op;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values ((select auth.uid()), audit_action, audit_entity, audit_entity_id, audit_metadata);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function private.audit_row_change() owner to postgres;
revoke all on function private.audit_row_change() from public;

create trigger categories_audit_row_change
after insert or update or delete on public.categories
for each row execute function private.audit_row_change();

create trigger products_audit_row_change
after insert or update or delete on public.products
for each row execute function private.audit_row_change();

create trigger highlights_audit_row_change
after insert or update or delete on public.highlights
for each row execute function private.audit_row_change();

create trigger store_settings_audit_row_change
after insert or update or delete on public.store_settings
for each row execute function private.audit_row_change();

-- O lock por escopo impede duas criações de escolherem a mesma posição.
create or replace function private.assign_sort_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lock_scope text;
begin
  if tg_table_name = 'products' then
    lock_scope := 'products:' || new.category_id::text;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lock_scope, 0));
    select coalesce(pg_catalog.max(products.sort_order), -1) + 1
    into new.sort_order
    from public.products
    where products.category_id = new.category_id;
  elsif tg_table_name = 'categories' then
    lock_scope := 'categories';
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lock_scope, 0));
    select coalesce(pg_catalog.max(categories.sort_order), -1) + 1
    into new.sort_order
    from public.categories;
  elsif tg_table_name = 'highlights' then
    lock_scope := 'highlights';
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lock_scope, 0));
    select coalesce(pg_catalog.max(highlights.sort_order), -1) + 1
    into new.sort_order
    from public.highlights;
  else
    raise exception 'Tabela sem escopo de ordenação: %', tg_table_name;
  end if;

  return new;
end;
$$;

alter function private.assign_sort_order() owner to postgres;
revoke all on function private.assign_sort_order() from public;

create trigger categories_assign_sort_order
before insert on public.categories
for each row execute function private.assign_sort_order();

create trigger products_assign_sort_order
before insert on public.products
for each row execute function private.assign_sort_order();

create trigger highlights_assign_sort_order
before insert on public.highlights
for each row execute function private.assign_sort_order();

-- Só os triggers, executados como postgres, passam a gravar auditoria.
revoke insert on table public.audit_logs from authenticated;
drop policy if exists "admin insere auditoria" on public.audit_logs;

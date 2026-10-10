-- Dados públicos e configuráveis da loja. Aplicar primeiro em homologação.

create table public.store_settings (
  id boolean primary key default true check (id),
  name text not null check (char_length(trim(name)) > 0),
  tagline text,
  address text,
  maps_url text,
  phone text,
  whatsapp text check (whatsapp is null or whatsapp ~ '^[1-9][0-9]{7,14}$'),
  instagram text,
  opening_hours jsonb not null default '[]'::jsonb check (jsonb_typeof(opening_hours) = 'array'),
  status_override text not null default 'auto' check (status_override in ('auto', 'open', 'closed')),
  notice text check (notice is null or char_length(notice) <= 140),
  updated_at timestamptz not null default now()
);

create trigger store_settings_set_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

insert into public.store_settings (
  name,
  tagline,
  opening_hours
) values (
  'Salgaê Lanchonete',
  'Salgados quentes',
  '[
    {"day": 0, "closed": true, "open": "08:00", "close": "18:00"},
    {"day": 1, "closed": false, "open": "08:00", "close": "18:00"},
    {"day": 2, "closed": false, "open": "08:00", "close": "18:00"},
    {"day": 3, "closed": false, "open": "08:00", "close": "18:00"},
    {"day": 4, "closed": false, "open": "08:00", "close": "18:00"},
    {"day": 5, "closed": false, "open": "08:00", "close": "18:00"},
    {"day": 6, "closed": false, "open": "08:00", "close": "18:00"}
  ]'::jsonb
)
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

-- A Data API só recebe os privilégios necessários; RLS continua sendo a autorização final.
revoke all privileges on table public.store_settings from anon, authenticated;
grant select on table public.store_settings to anon;
grant select, update on table public.store_settings to authenticated;

create policy "leitura anon dos dados da loja"
on public.store_settings for select to anon
using (true);

create policy "leitura autenticada dos dados da loja"
on public.store_settings for select to authenticated
using (true);

create policy "admin atualiza dados da loja"
on public.store_settings for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

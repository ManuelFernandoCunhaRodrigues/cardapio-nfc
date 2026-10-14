-- Administrador de teste para o banco LOCAL (`supabase start`), usado pelo CI e pelos testes de
-- ponta a ponta. NUNCA rodar em stage nem em produção: cria um login com senha conhecida por
-- quem roda o script.
--
-- Só funciona pelo psql, com as duas variáveis:
--   psql "$DB_URL" -v admin_email=... -v admin_password=... -f supabase/tests/fixtures/admin_local.sql
-- Os comandos com barra invertida abaixo fazem o arquivo falhar no SQL Editor do Supabase, de
-- propósito.
--
-- O id é o mesmo ADMIN_ID usado em supabase/tests/*.sql.

\set ON_ERROR_STOP on
\if :{?admin_email}
\else
  \echo 'Informe -v admin_email=...'
  \quit
\endif
\if :{?admin_password}
\else
  \echo 'Informe -v admin_password=...'
  \quit
\endif

\set admin_id 'bae2a6b4-c6fd-4567-b01c-01c70e5d940a'

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000', :'admin_id', 'authenticated', 'authenticated',
  :'admin_email', extensions.crypt(:'admin_password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
)
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  updated_at = now();

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(), :'admin_id', :'admin_id', 'email',
  jsonb_build_object('sub', :'admin_id', 'email', :'admin_email', 'email_verified', true),
  now(), now(), now()
)
on conflict (provider_id, provider) do update set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (id, name, role, is_active)
values (:'admin_id', 'Administrador local', 'admin', true)
on conflict (id) do update set role = 'admin', is_active = true;

commit;

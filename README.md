# Salgaê Lanchonete

Fundação do cardápio digital **local/presencial** da Salgaê Lanchonete. Este repositório não inclui delivery, carrinho, checkout ou pagamento.

## Requisitos

- Node.js 22 ou superior
- npm
- Um projeto Supabase configurado para o ambiente desejado

## Executar localmente

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha em `.env.local` a URL e a chave anônima/publicável do Supabase. A aplicação valida essas variáveis ao acessar recursos que dependem do Supabase e informa claramente quando estiverem ausentes ou inválidas.

- Homologação (SALGAE-STAGING): `https://csirmtmerqpbhatruzaf.supabase.co`
- Produção: `https://gqwtjrdfnkfitslolofg.supabase.co`

Não use nem exponha `service_role`: ela não é necessária neste épico e nunca deve ir para variáveis `NEXT_PUBLIC_`.

## Scripts

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o ambiente de desenvolvimento. |
| `npm run build` | Gera o build de produção. |
| `npm run start` | Inicia o build de produção. |
| `npm run lint` | Executa o ESLint. |
| `npm run typecheck` | Valida o TypeScript estrito sem emitir arquivos. |
| `npm test` | Executa os testes unitários com Vitest. |

## Banco de dados e migrations

As migrations ficam em `supabase/migrations/` e **não são aplicadas automaticamente**. Revise sempre a migration antes de aplicá-la no ambiente correspondente.

Exemplo usando a CLI do Supabase, com o projeto de homologação vinculado:

```bash
npx supabase login
npx supabase link --project-ref csirmtmerqpbhatruzaf
npx supabase db push
```

Para dados de exemplo, use `supabase/seed.sql` somente em ambiente local ou de homologação. Não execute o seed em produção.

Os dados únicos da loja são criados pela migration `20261008232020_store_settings.sql`. Administradores ativos podem editá-los em `/admin/loja`; visitantes apenas os leem para a futura aba Info e para o status aberto/fechado.

### Promover o primeiro administrador

1. Crie o usuário em **Authentication > Users** no Supabase.
2. Pelo SQL Editor, como responsável autorizado, crie o perfil se ele ainda não existir e mantenha-o inativo até a promoção:

```sql
insert into public.profiles (id, name, role, is_active)
values ('UUID_DO_USUARIO', 'Nome do responsável', 'admin', false)
on conflict (id) do nothing;
```

3. Depois da conferência do responsável, promova-o manualmente:

```sql
update public.profiles
set role = 'admin', is_active = true
where id = 'UUID_DO_USUARIO';
```

Não há trigger para promover automaticamente nenhum usuário. A autorização é conferida no banco por RLS e pela função interna `private.is_admin()`, que não é exposta pela Data API.

## Fluxo de ambientes

- `develop` → homologação (SALGAE-STAGING)
- `main` → produção

Antes de promover, execute lint, typecheck, testes e build. Migrations devem ser aplicadas primeiro em homologação e somente depois, revisadas, em produção.

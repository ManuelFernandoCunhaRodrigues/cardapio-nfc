# Migrations aplicadas pelo GitHub Actions

O workflow `.github/workflows/migrations.yml` aplica os arquivos de `supabase/migrations/` nos bancos do Supabase com a CLI oficial (`supabase db push`). O objetivo é ninguém mais colar SQL à mão: foi assim que duas migrations ficaram registradas em produção com uma versão diferente da do repositório.

## Estado em 2026-11-15

O workflow está no repositório, mas **ainda não rodou contra um banco de verdade**: os três segredos abaixo precisam ser cadastrados pelo responsável, e a produção precisa do acerto de histórico descrito mais adiante. Desde o PR #88, sem os segredos o job **falha** e diz o que falta, em vez de terminar verde sem conferir nada. O job **banco local e ponta a ponta** do CI prova, a cada PR, que todas as migrations aplicam do zero.

A migration `20261115120000_product_sort_order_on_category_change` está aplicada só no stage. Ela precisa chegar à produção antes do merge da próxima promoção.

## Como funciona

| Quando | O que acontece |
| --- | --- |
| Push na `develop` que mexe em `supabase/migrations/` | Aplica no **stage** o que ainda não foi aplicado. |
| Pull request para a `main` | Só confere a **produção**. Se houver migration que a produção ainda não tem, a verificação falha e o merge fica marcado como reprovado. |
| Actions > Migrations > **Run workflow**, ambiente `producao` | Aplica na **produção**. É o passo manual, feito antes do merge da promoção. Só aceita as branches `develop` e `main`. |
| Push na `main` | Confere de novo e aplica o que faltar. Em uso normal não sobra nada. |

A ordem que isso garante é a mesma de `docs/publicacao-producao.md`: **o banco de produção recebe a migration antes do código que depende dela**. O passo de produção continua sendo um clique de uma pessoa, de propósito.

Antes de aplicar, o job sempre mostra a lista de migrations locais e remotas (`supabase migration list`) e o que seria aplicado (`supabase db push --dry-run`).

Antes disso tudo, o job **banco local e ponta a ponta** do CI já aplicou as mesmas migrations em um banco vazio. Uma migration com erro de SQL não chega ao stage.

## Configuração, uma vez só

O workflow precisa de três segredos do repositório, em **GitHub > Settings > Secrets and variables > Actions > New repository secret**:

| Segredo | De onde vem |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase > Account > Access Tokens > Generate new token. |
| `SUPABASE_DB_PASSWORD_STAGE` | Senha do banco do projeto SALGAE-STAGING (Project Settings > Database). Se não souber, use "Reset database password". |
| `SUPABASE_DB_PASSWORD_PRODUCAO` | A mesma coisa, no projeto SALGAE-PRODUCTION. |

Enquanto os segredos não existirem, o job falha sem aplicar nada. Como ele roda em todo PR para a `main` e em push que mude migrations, essa verificação fica vermelha até o cadastro.

Os identificadores dos dois projetos estão no próprio workflow; não são segredo.

## Acerto do histórico de produção, uma vez só

Em produção, quatro migrations foram aplicadas pelo SQL Editor ou pela ferramenta do Supabase e ficaram registradas com a data em que rodaram:

| Migration | Versão no repositório | Versão registrada em produção |
| --- | --- | --- |
| `video_compression_storage` | `20261011003026` | `20261013114751` |
| `atomic_sort_order_swap` | `20261013151000` | `20261013214047` |
| `audit_and_sort_order_triggers` | `20261014120000` | `20261014140106` |
| `product_slug` | `20261014150000` | `20261014140119` |

Com essa diferença, a CLI recusa o `db push` em produção ("remote migration versions not found in local migrations directory"). O acerto troca só o número registrado; o esquema do banco não muda. Pela CLI, com o projeto de produção ligado:

```bash
npx supabase migration repair --status reverted 20261013114751 20261013214047 20261014140106 20261014140119
npx supabase migration repair --status applied 20261011003026 20261013151000 20261014120000 20261014150000
```

Depois, `npx supabase migration list` tem de mostrar as mesmas versões nas duas colunas, menos as migrations que a produção ainda não recebeu. O stage estava alinhado em 2026-10-13.

## Promoção para a produção, passo a passo

1. Abrir o PR `develop` → `main`.
2. Se a verificação **migrations** falhar, há migration nova: em **Actions > Migrations > Run workflow**, escolher a branch `develop` e o ambiente `producao`.
3. Reexecutar a verificação no PR. Ela passa quando a produção está em dia.
4. Fazer o merge.

## Limites

- **Não desfaz.** Migration aplicada não tem "voltar" automático. Mudança destrutiva pede backup antes e SQL de reversão revisado, como já diz `docs/publicacao-producao.md`.
- **Stage não espera.** No stage, o código novo e a migration saem ao mesmo tempo depois do merge na `develop`. Por alguns segundos a tela pode pedir algo que o banco ainda não tem. Em produção isso não acontece, porque a migration vai antes.
- **Migrations precisam ser compatíveis com o código anterior.** Como o banco muda antes do código, uma migration não pode remover nem renomear o que a versão em produção ainda usa. Faça em dois passos: primeiro acrescenta, depois de publicar o código novo remove.

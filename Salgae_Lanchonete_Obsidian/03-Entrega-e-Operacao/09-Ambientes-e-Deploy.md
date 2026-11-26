---
titulo: "Ambientes e deploy"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-11-16
---
# Ambientes e deploy

Voltar: [[00-Comece-Aqui]] · Fluxo de código: [[10-Git-e-Fluxo-de-Entrega]]

## Separação obrigatória

> **Nomes dos ambientes (2026-10-10):** o projeto passa a usar três nomes — **desenvolvimento** (a máquina de quem programa, com `npm run dev`, apontando para o banco de stage), **stage** (antes chamado de "homologação": Supabase `SALGAE-STAGING` + projeto Vercel `salgae-homologacao`, branch `develop`; cada PR gera um deploy de preview) e **produção** (Supabase `SALGAE-PRODUCTION` + projeto Vercel `salgae-producao`, branch `main`). Onde este vault disser "homologação", leia "stage".

O projeto terá dois ambientes reais e isolados, cada um com seu projeto Vercel e seu projeto Supabase.

| Ambiente | Branch principal | Projeto Vercel | Projeto Supabase | Finalidade |
| --- | --- | --- | --- | --- |
| Homologação | `develop` | Salgaê — Homologação | `SALGAE-STAGING` | Testes técnicos, revisão visual e validação da operação. |
| Produção | `main` | Salgaê — Produção | `SALGAE-PRODUCTION` | Cardápio mostrado nas demonstrações para clientes. |

> Os nomes exatos podem mudar no provedor, mas a separação deve permanecer.

## Projetos Supabase provisionados

Criados em 2026-10-08 na organização **Salgaê Lanchonete** (plano Free), região `sa-east-1` (São Paulo).

| Ambiente | Projeto | Ref | URL da API |
| --- | --- | --- | --- |
| Homologação | `SALGAE-STAGING` | `csirmtmerqpbhatruzaf` | `https://csirmtmerqpbhatruzaf.supabase.co` |
| Produção | `SALGAE-PRODUCTION` | `gqwtjrdfnkfitslolofg` | `https://gqwtjrdfnkfitslolofg.supabase.co` |

O projeto antigo `xjvibtlnesfzvdyjhivg` (criado automaticamente, em `us-east-1`) está pausado e não faz parte do fluxo.

> **Pausa automática: reativar antes de demonstrar.** No plano Free, projetos sem atividade por cerca de 7 dias são pausados. O sistema é uma demonstração e fica no plano gratuito ([[03-Decisoes-do-Projeto]]). O workflow **Ambientes no ar** chama o `/api/health` dos dois ambientes a cada 2 dias, o que conta como uso e avisa por e-mail quando algum cai. Antes de cada demonstração, conferir se a produção está ativa e, se estiver pausada, restaurar o projeto no painel do Supabase (`docs/publicacao-producao.md`). A produção foi restaurada em 2026-11-15.

## Por que dois projetos Vercel

Não será usado apenas um preview temporário da mesma aplicação. Cada ambiente tem URL, variáveis, banco e regras próprios. Isso permite a equipe testar uma atualização sem criar ou alterar produtos reais e sem risco de o NFC do estabelecimento apontar para uma versão em avaliação.

## Variáveis de ambiente

Cada projeto Vercel deve receber apenas as chaves do seu ambiente:

- URL do Supabase correspondente;
- chave pública/anon permitida ao frontend;
- configurações de URL pública e autenticação;
- `NEXT_PUBLIC_SITE_ENV`: `production` somente no projeto de produção. Ausente ou com outro valor, o site se comporta como homologação e bloqueia a indexação (`robots.txt` com `Disallow: /` e `noindex`);
- `NEXT_PUBLIC_SITE_URL`: endereço público do ambiente, usado como base dos metadados;
- qualquer segredo de servidor somente no ambiente privado.

Desde a decisão de 2026-11-03, cada ambiente publica site e API juntos, em um único projeto. Plano em `docs/planejamento/dois-projetos-por-ambiente.md`.

- **Variáveis:** só as acima; a API usa a URL e a chave pública do Supabase do próprio site. `API_URL` e `WEB_ORIGIN` não são mais necessárias na Vercel, e não há segredo novo.
- **Build:** lê o banco direto, sem servidor de API no ar. O Supabase do ambiente precisa estar acessível durante o build.
- **Vercel (stage):** `salgae-homologacao`, Root Directory `apps/web`, publica a `develop`. `salgae-web-previa` foi excluído em 2026-11-03. `salgae-api-stage` foi excluído pelo responsável em 2026-11-25; no mesmo dia saíram `apps/api/src/index.ts`, `apps/api/vercel.json` e a entrada `index` do build da API.
- **Região:** as funções rodam em São Paulo (`"regions": ["gru1"]` em `apps/web/vercel.json`, PR #89), perto do banco. O plano Hobby aceita uma região.
- **Vercel (produção):** `salgae-producao` publica a `main`, com Root Directory `apps/web`. Não se cria projeto de API para produção. Desde 2026-11-04, ele só gera build de produção (Ignored Build Step: `[ "$VERCEL_ENV" != "production" ]`): as variáveis existem só nesse ambiente, e copiá-las para as prévias faria PRs em teste usarem o banco de produção.
- **Vídeo:** desde 2026-11-15 (PR #94) a API processa o vídeo. A rota `/admin/midia/video` do Next continua existindo só para repassar o pedido, porque a compactação precisa de uma função de até 180 s com o binário do `ffmpeg`. Se um dia a API for para outra origem, a CSP precisará liberá-la em `connect-src`.
- **VPS:** o site roda com Node e já inclui a API. Para a API em servidor separado existe o `Dockerfile`, que exige `WEB_ORIGIN`; o passo a passo está no `README.md` ("Servidor próprio").

Nunca copiar arquivo `.env` de produção para homologação sem revisar cada valor. Nunca commitar `.env` ou segredo no Git.

## Processo de publicação

1. Implementar em branch `feat/...`.
2. Integrar em `develop`.
3. O Vercel de homologação publica automaticamente.
4. Validar fluxo público, painel, dados e imagens em homologação.
5. Abrir PR de `develop` para `main`.
6. Se houver migration nova, aplicá-la em produção pelo workflow **Migrations** do GitHub Actions antes do merge; o PR fica reprovado enquanto a produção não a tiver (`docs/migrations-pelo-ci.md`). No stage a migration é aplicada sozinha no merge na `develop`. **Enquanto os segredos não forem cadastrados, o workflow falha e não aplica nada**, e a migration vai à mão, com uma cópia do banco antes (`docs/publicacao-producao.md`).
7. Após revisão e aprovação, merge em `main` publica a produção.
8. Executar checklist pós-publicação e registrar resultado.

## Workflows e segredos

| Workflow | O que faz | Segredos |
| --- | --- | --- |
| CI | Verificações, banco local, E2E, imagem Docker e banco fora do ar, a cada PR para `develop` ou `main` | Nenhum |
| Migrations | Aplica no stage (push na `develop`), confere a produção (PR para a `main`) e aplica na produção (Run workflow) | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD_STAGE`, `SUPABASE_DB_PASSWORD_PRODUCAO` |
| Ambientes no ar | Ping no `/api/health` a cada 2 dias; cópia do banco da produção aos domingos, guardada por 30 dias | A cópia usa `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD_PRODUCAO` |

Situação em 2026-11-16:

- Os três segredos ainda não foram cadastrados (responsável). Sem eles, Migrations e a cópia semanal falham de propósito, dizendo o que falta.
- O GitHub só roda agendamentos a partir da `main`. O **Ambientes no ar** está na `develop` e começa a rodar sozinho depois da próxima promoção.
- A `main` está na promoção de 2026-11-04 (PR #83). A migration `20261115120000_product_sort_order_on_category_change` está só no stage e precisa ir à produção antes do merge da próxima promoção.

## Recuperação

Se uma versão em produção falhar, restaurar o deploy anterior conhecido como estável e investigar em homologação. Uma correção de urgência ainda deve entrar no Git, ser validada no mínimo necessário e posteriormente sincronizada com `develop`.

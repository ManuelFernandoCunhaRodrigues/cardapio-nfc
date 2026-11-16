---
titulo: "Mudança planejada — separar backend e frontend, Motion e Playwright"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
  - ideia
  - aprovado
atualizado: 2026-11-16
---
# Mudança planejada — separar backend e frontend, Motion e Playwright

Voltar: [[00-Comece-Aqui]] · Relacionado: [[06-Arquitetura-e-Stack]] · [[12-Seguranca-e-Qualidade]] · [[03-Decisoes-do-Projeto]]

> **Status final (2026-11-16): concluída.** Fase 1 (Playwright) nos PRs #67 e #69; separação e Motion no #74 (estrutura completa, E0 a E8) e no #80 (API dentro do site, um projeto Vercel por ambiente); animação do botão de login no #82. Tudo isso chegou à produção na promoção de 2026-11-04 (PR #83, com o Next 16.4.3). Depois, o vídeo também passou para a API (PR #94, 2026-11-15), o que revê a frase "o envio de vídeo fica no Next" abaixo. Ficaram pendentes: excluir o projeto `salgae-api-stage` na Vercel e remover os arquivos que só servem a ele, e a gaveta do destaque encoberta no Pixel 7 emulado (o teste continua com `test.skip`).

> **Status: plano aprovado para desenvolvimento em 2026-10-23.** O responsável pediu para executar os três pontos junto com o Codex, na ordem Playwright → separação → Motion. Plano completo em `docs/planejamento/separacao-backend-frontend-plano.md`.

> **Mudança de hospedagem em 2026-11-03:** o responsável decidiu ter 2 projetos na Vercel, um de teste e um de produção. Isso substitui o item 2 das decisões abaixo: a API continua em `apps/api`, com as mesmas camadas e o Dockerfile, mas roda dentro do site em cada ambiente. O envio de vídeo fica no Next. Plano com consenso do Codex em `docs/planejamento/dois-projetos-por-ambiente.md`. Pedido para o final: animação de login no botão "Entrar no painel".

## O que foi pedido (2026-10-19)

Nas palavras do responsável, organizadas: "somente anote essa mudança que eu vou fazer nesse projeto".

1. **Separar o backend do frontend.**
2. **Usar Motion para React** (biblioteca de animação, pacote `motion`, importada de `motion/react`).
3. **Testes com Playwright.**

Ele disse que **ele mesmo** vai fazer a mudança.

## Como o projeto está hoje (para quem for desenvolver)

- **Uma aplicação única em Next.js** (App Router): cardápio público em `app/(public)`, painel em `app/admin`, regras e acesso ao Supabase em `lib/` (`lib/supabase`, `lib/admin`, `lib/menu`, `lib/validators` etc.). Não existe servidor próprio: o "backend" hoje é o Supabase (banco, Auth, Storage) mais o código de servidor do próprio Next.js.
- **Animações:** não há biblioteca de animação instalada; o que existe é feito com CSS e respeita o pedido de menos animação do aparelho (ver [[22-Carrossel-de-Destaques]]).
- **Playwright já existe:** `@playwright/test` 1.64.0, `playwright.config.ts` e testes em `e2e/` (`cardapio.spec.ts`, `painel.spec.ts`, `csp.ts`), rodando no CI com banco local. O item 3 parece ser **ampliar** o uso do Playwright, não começar do zero — confirmar com o responsável.

## Decisões e plano aprovado (2026-10-23)

Respostas do responsável:

1. **Separar como:** um repositório só (monorepo) com `apps/web` (Next.js, só tela), `apps/api` (API Node com Hono, regras e acesso ao Supabase) e `packages/core` (validações, tipos do banco e regras comuns). O Supabase continua como banco, login e arquivos.
2. **Hospedagem da API:** segundo projeto na Vercel Hobby (stage e produção), sem custo, com Dockerfile pronto para levar a uma VPS.
3. **Ordem:** Playwright primeiro (rede de segurança), depois a separação, por último o Motion (para não mover os arquivos animados duas vezes).
4. **Playwright:** é ampliar o que existe; Vitest continua para as regras puras.

Resumo do plano (revisado pelo Codex):

- **Fase 1 — Playwright (2 PRs):** login salvo uma vez, um projeto canônico que altera dados, testes de categorias, destaques, loja (relógio congelado), produtos, cache, formulários; depois foto, vídeo, acessibilidade (axe) e "menos movimento".
- **Fase 2 — Separação (~12 PRs):** prova de conceito do Hono com ffmpeg na Vercel primeiro; depois monorepo sem mudar comportamento, `packages/core`, esqueleto da API, leituras públicas e escritas do painel pela API, um domínio por PR (expandir/contrair).
  - O navegador fala com o web e o web fala com a API (sem CORS); **exceção:** o processamento de vídeo vai direto à API, para duas funções não esperarem o ffmpeg ao mesmo tempo.
  - Sem chave `service_role`: a API usa o token do usuário, um cliente por requisição, e a RLS continua valendo.
  - API fora do ar não estraga o cardápio: o build falha e a revalidação mantém a última versão boa.
  - Cache por etiqueta, com atualização imediata do que mudou.
- **Fase 3 — Motion (3 PRs):** provider de cliente com `reducedMotion="user"` e `LazyMotion`; carrossel, cards, barra inferior, busca e painel; HTML estático nunca nasce invisível.

Depende do responsável: trocar o Root Directory dos projetos do site na Vercel e criar os projetos da API (ou autorizar), e o "sim" de cada promoção para produção.

## Andamento

### Fase 1 — Playwright: concluída em 2026-10-24

- **PR #67:** login salvo uma vez, projetos por papel (só o painel em desktop grava dados), limpeza automática do que cada teste cria e 16 testes novos (categorias, destaques, loja com relógio congelado, edição e exclusão de produto, cache, formulários).
- **PR #69:** foto e vídeo enviados pelo painel aparecendo no cardápio (a exclusão do produto apaga os arquivos), acessibilidade com axe nas telas públicas e do painel, carrossel respeitando "menos movimento".
- **Total:** 56 execuções em 15 arquivos, todas verdes; o job de ponta a ponta leva cerca de 5 minutos.
- **Defeitos reais encontrados e corrigidos (PR #69):** lista de definições mal formada no Resumo do painel; contraste baixo no filtro ativo de Produtos (3,93:1, mínimo 4,5:1) e nos horários de dia fechado na Loja.
- **Comportamento observado (possível melhoria, não alterado):** no formulário de produto, com nome e preço errados ao mesmo tempo, o painel mostra só o erro do nome; o do preço aparece na tentativa seguinte.
- **Segurança (PR #64, na develop e no stage):** Next 16.4.0 → 16.4.2 e Zod 4.6.5 → 4.6.7, corrigindo falhas críticas apontadas pelo `npm audit`. Falta promover para a produção. **Promovido:** a produção recebeu o Next 16.4.3 no PR #83, em 2026-11-04.

### Fase 2 — Separação: concluída (PRs #74 e #80)

- **2026-10-28 — PR 2.1 (monorepo) antes da prova de conceito.** O responsável pediu para estruturar as pastas separando o front do back. O PR 2.1 veio primeiro porque não depende do resultado da prova de conceito: tanto o plano A (API com vídeo) quanto o plano B (vídeo fica no Next) usam o monorepo.
  - O site foi movido com `git mv` para `apps/web` (pacote `@salgae/web`); a raiz virou npm workspaces e os comandos de sempre (`npm run dev`, `build`, `test`, `test:e2e`…) continuam na raiz, repassando para o pacote.
  - `supabase/`, `docs/`, o vault e o teste de banco (`scripts/testar-banco-local.sh`) ficam na raiz.
  - O `next.config.ts` aponta `outputFileTracingRoot` e `turbopack.root` para a raiz, porque as dependências ficam no `node_modules` de lá; o ffmpeg continua entrando na função de vídeo.
  - O `.env.local` agora fica em `apps/web/.env.local`.
  - **Depende do responsável antes do merge:** na Vercel, o projeto `salgae-homologacao` precisa de *Root Directory = `apps/web`* (com "Include files outside the root directory" ligado). Sem isso, o stage não publica a `develop` nova (o site no ar não cai, fica na versão anterior). O `salgae-producao` só troca na promoção para a `main`.
- **2026-10-28 — `apps/web` organizado por funcionalidade, com back e front separados em pastas.** O responsável comparou com uma estrutura de app Vite (`src/features/…`, `pages/`, `services/`). Decisão: **não trocar o Next.js por Vite**, porque o projeto depende de servidor (ffmpeg, Server Actions, páginas prontas no servidor para SEO e para abrir rápido, sessão renovada no `proxy.ts`). Ficou só a parte boa da proposta, a organização por funcionalidade.
  - Código em `apps/web/src/`: `app/` (rotas), `features/` (`menu`, `products`, `categories`, `highlights`, `store`, `media`, `auth`, `admin`), `components/ui/`, `lib/` (infraestrutura: Supabase, SEO, CSP, logs, QR) e `proxy.ts`.
  - Em cada funcionalidade: `server/` = back (Server Actions, Supabase, ffmpeg); `components/` e `client/` = front; `schemas/` e `rules/` = usados pelos dois lados. As Server Actions saíram de `app/admin/(painel)/*/actions.ts` para `features/*/server/actions.ts`; a rota de vídeo continua em `app/`.
  - O `server/` de cada funcionalidade é o que vai para `apps/api`; `schemas/` e `rules/` vão para `packages/core`.
  - Arquivos sem uso: nenhum arquivo de código versionado ficou sem uso (grafo de imports a partir das páginas, rotas, proxy, testes e scripts). As imagens e os vídeos não versionados em `apps/web/public/` e na raiz não são usados pelo código; ficam com o responsável decidir.
- **Próximos:** PR 2.0 (prova de conceito do Hono com ffmpeg num projeto de teste da Vercel), PR 2.2 (`packages/core`), PR 2.3 (esqueleto de `apps/api`).
- **2026-10-30 — Plano v3 (consenso Claude + Codex).** O responsável achou a estrutura ainda bagunçada e pediu: backend separado do frontend com camadas (controller, service, repository), remover arquivos sem uso, Playwright e Motion, código no padrão do livro *Código Limpo*, para outro desenvolvedor entender fácil. O plano foi revisado duas vezes pelo Codex (1ª: reprovado, 7 problemas; 2ª: aprovado com 3 ajustes) e está em `docs/planejamento/plano-v3-estrutura-playwright-motion.md`. Substitui as Fases 2 e 3 do plano anterior.
  - Arquitetura: `apps/web` (Next, só tela), `apps/api` (Hono; `modules/<domínio>/` com `routes → controller → service → repository` e o service definindo a interface do repositório), `packages/core` (schemas, contratos, regras puras, tipos do banco) e `e2e/` (Playwright testando web + API).
  - Leituras públicas pela API **sem token** (acontecem no build e na revalidação); painel pela API com o token do admin; vídeo do navegador direto para a API. Cache por etiqueta (`fetch` com `next.tags`, `updateTag` depois de salvar).
  - Convenção de nomes: código em inglês, telas e endereços em português.
  - Forma de trabalho: execução dividida entre Claude e Codex; o Codex revisa e testa toda etapa e devolve problemas ao Claude; tudo numa branch de integração (`refactor/estrutura-completa`) e **só vai para o stage no fim**, depois de prévia completa e revisão final.
  - Etapas: E0 preparação · E1 prova de conceito na Vercel (barreira) · E2 Playwright na raiz · E3 `packages/core` · E4 esqueleto da API + CI · E5 leituras públicas · E6 escritas · E7 Motion · E8 fechamento · E9 prévia e stage.

- **2026-10-31 — Execução do plano v3 (E0 a E8).** Tudo numa branch de integração (`refactor/estrutura-completa`, PR rascunho #74); cada etapa revisada pelo Codex até "aprovado" e com o CI verde antes de seguir. Nada entrou na `develop` ainda.
  - **Feito:** E0 (workspaces e limpeza), E2 (Playwright na raiz, axe 4.14), E3 (`packages/core`), E4 (esqueleto da API e CI na ordem Supabase → API → build do site → E2E), E5 (leituras públicas pela API, com o cardápio mantido em cache se a API cair), E6 (escritas do painel pela API: loja, categorias, destaques, produtos e foto), E7 (Motion no cardápio e no painel) e E8 (`knip` no CI, fronteiras como erro no ESLint, README).
  - **Motion:** carrossel com arrasto pelo mouse (no toque fica a rolagem nativa), cards do cardápio entrando em cascata na primeira visita, indicador deslizando na barra inferior, resultados da busca, e no painel a gaveta e a confirmação com entrada e saída (a camada que sai ou fica coberta é inerte para leitor de tela e teclado; o foco volta a quem abriu), avisos e reordenação. Tudo respeita "menos movimento".
  - **Bloqueado:** E1 (prova de conceito na Vercel) — o computador está logado em outra conta da Vercel; pergunta enviada por e-mail. Por isso o **vídeo** continua como rota do Next por enquanto, e a E9 (prévia e stage) depende desse acesso.

- **2026-11-03 — Um projeto Vercel por ambiente.** O responsável escolheu 2 projetos, um de teste e um de produção, em vez de site e API separados em cada ambiente. O plano teve consenso entre Claude e Codex depois de 3 revisões (`docs/planejamento/dois-projetos-por-ambiente.md`).
  - **Como ficou:** a API segue em `apps/api`, com as mesmas camadas, e roda dentro do site, no mesmo processo; ela também responde em `/api`. Só `apps/web/src/lib/api/embedded-api.ts` a importa. O `Dockerfile` continua para quem quiser a API em servidor separado.
  - **Vídeo:** fica definitivamente no Next, e a E1 saiu do escopo. Com os dois no mesmo projeto, levar o vídeo para a API não traria ganho. **Revisto em 2026-11-15:** a revisão geral mostrou que a rota do vídeo repetia regras e autorização da API, e o vídeo passou para a API no PR #94; a rota do Next só repassa o pedido.
  - **Descartado:** Vercel Services (beta, e seus bindings não existem no build) e o site chamando a si mesmo por HTTP (o build não tem servidor para responder).
  - **Para conferir na E9:** no Pixel 7 emulado do Playwright, o botão "Criar destaque" do fim do formulário da gaveta fica encoberto; conferir num celular de verdade. **Ainda pendente em 2026-11-16** (QA-03 da revisão, onda 5).
- **2026-11-03 e 2026-11-04 — Fechamento.** O PR #80 entrou na `develop` em 2026-11-03 e a promoção para a produção (PR #83) em 2026-11-04.

## Perguntas em aberto (respondidas em 2026-10-23, ver acima)

- **Separar como?** Duas pastas no mesmo repositório (por exemplo `frontend/` e `backend/`), dois repositórios, ou só separar melhor as camadas dentro do Next.js?
- **Qual backend?** Uma API própria (Node, outra linguagem?) entre o site e o Supabase, ou o Supabase continua sendo o backend e a separação é de organização?
- **Hospedagem:** o frontend continua na Vercel? Onde rodaria um backend próprio, mantendo o plano gratuito ([[09-Ambientes-e-Deploy]])? A [[20-Ideia-Pedido-pela-Mesa]] já cita uma VPS Ubuntu.
- **Motion:** em quais telas (carrossel, cards, transições do painel)? A regra de respeitar "menos animação" do aparelho continua valendo.
- **Playwright:** quais fluxos novos devem ganhar teste? E os testes de unidade com Vitest continuam?

## Pontos de atenção registrados

- Separar o backend muda segurança e deploy: chaves do Supabase só no servidor, CORS, CSP (`connect-src`), sessão do painel e o workflow de migrations precisam ser revistos ([[12-Seguranca-e-Qualidade]]).
- O CI atual (tipos, lint, Vitest, Playwright com Supabase local) teria de ser dividido ou adaptado para as duas partes.

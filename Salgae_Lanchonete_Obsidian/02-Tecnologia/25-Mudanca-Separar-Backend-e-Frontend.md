---
titulo: "Mudança planejada — separar backend e frontend, Motion e Playwright"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
  - ideia
  - aprovado
atualizado: 2026-10-23
---
# Mudança planejada — separar backend e frontend, Motion e Playwright

Voltar: [[00-Comece-Aqui]] · Relacionado: [[06-Arquitetura-e-Stack]] · [[12-Seguranca-e-Qualidade]] · [[03-Decisoes-do-Projeto]]

> **Status: plano aprovado para desenvolvimento em 2026-10-23.** O responsável pediu para executar os três pontos junto com o Codex, na ordem Playwright → separação → Motion. Plano completo em `docs/planejamento/separacao-backend-frontend-plano.md`.

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

## Perguntas em aberto (respondidas em 2026-10-23, ver acima)

- **Separar como?** Duas pastas no mesmo repositório (por exemplo `frontend/` e `backend/`), dois repositórios, ou só separar melhor as camadas dentro do Next.js?
- **Qual backend?** Uma API própria (Node, outra linguagem?) entre o site e o Supabase, ou o Supabase continua sendo o backend e a separação é de organização?
- **Hospedagem:** o frontend continua na Vercel? Onde rodaria um backend próprio, mantendo o plano gratuito ([[09-Ambientes-e-Deploy]])? A [[20-Ideia-Pedido-pela-Mesa]] já cita uma VPS Ubuntu.
- **Motion:** em quais telas (carrossel, cards, transições do painel)? A regra de respeitar "menos animação" do aparelho continua valendo.
- **Playwright:** quais fluxos novos devem ganhar teste? E os testes de unidade com Vitest continuam?

## Pontos de atenção registrados

- Separar o backend muda segurança e deploy: chaves do Supabase só no servidor, CORS, CSP (`connect-src`), sessão do painel e o workflow de migrations precisam ser revistos ([[12-Seguranca-e-Qualidade]]).
- O CI atual (tipos, lint, Vitest, Playwright com Supabase local) teria de ser dividido ou adaptado para as duas partes.

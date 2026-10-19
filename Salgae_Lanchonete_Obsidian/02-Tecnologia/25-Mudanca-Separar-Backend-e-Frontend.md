---
titulo: "Mudança planejada — separar backend e frontend, Motion e Playwright"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
  - ideia
  - em-analise
atualizado: 2026-10-19
---
# Mudança planejada — separar backend e frontend, Motion e Playwright

Voltar: [[00-Comece-Aqui]] · Relacionado: [[06-Arquitetura-e-Stack]] · [[12-Seguranca-e-Qualidade]] · [[03-Decisoes-do-Projeto]]

> **Status: mudança anotada. Não está aprovada para desenvolvimento.**
> Só entra em desenvolvimento quando o responsável disser, de forma explícita, que quer desenvolver esta mudança. Até lá, nada de branch de código, pacote novo ou reestruturação de pastas.

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

## Perguntas em aberto

- **Separar como?** Duas pastas no mesmo repositório (por exemplo `frontend/` e `backend/`), dois repositórios, ou só separar melhor as camadas dentro do Next.js?
- **Qual backend?** Uma API própria (Node, outra linguagem?) entre o site e o Supabase, ou o Supabase continua sendo o backend e a separação é de organização?
- **Hospedagem:** o frontend continua na Vercel? Onde rodaria um backend próprio, mantendo o plano gratuito ([[09-Ambientes-e-Deploy]])? A [[20-Ideia-Pedido-pela-Mesa]] já cita uma VPS Ubuntu.
- **Motion:** em quais telas (carrossel, cards, transições do painel)? A regra de respeitar "menos animação" do aparelho continua valendo.
- **Playwright:** quais fluxos novos devem ganhar teste? E os testes de unidade com Vitest continuam?

## Pontos de atenção registrados

- Separar o backend muda segurança e deploy: chaves do Supabase só no servidor, CORS, CSP (`connect-src`), sessão do painel e o workflow de migrations precisam ser revistos ([[12-Seguranca-e-Qualidade]]).
- O CI atual (tipos, lint, Vitest, Playwright com Supabase local) teria de ser dividido ou adaptado para as duas partes.

---
titulo: "Revisão geral e plano de ação (2026-11-15)"
area: Operacao
tags:
  - operacao
  - qualidade
  - plano
atualizado: 2026-11-16
---
# Revisão geral e plano de ação (2026-11-15)

Pedido do responsável: revisão estrita de todo o projeto, de UX e de código, dividida entre Claude e Codex com subagentes, mais o que falta fazer e um plano de ação.

## Como foi feita

| Frente | Quem | Relatório completo |
| --- | --- | --- |
| UX do site público | Subagente Claude | `docs/revisao/2026-11-15/01-ux-site-publico.md` |
| UX do painel | Subagente Claude | `docs/revisao/2026-11-15/02-ux-painel.md` |
| Código do front (`apps/web`) | Subagente Claude no lugar do Codex | `docs/revisao/2026-11-15/03-codigo-front.md` |
| Código do backend (`apps/api`, `packages/core`) | Subagente Claude no lugar do Codex | `docs/revisao/2026-11-15/04-codigo-backend.md` |
| Banco, RLS e segurança | Subagente Claude | `docs/revisao/2026-11-15/05-banco-e-seguranca.md` |
| Entrega, testes, CI e o que falta | Subagente Claude | `docs/revisao/2026-11-15/06-entrega-testes-e-escopo.md` |
| Teste no navegador do stage, 375 px e 800 px | Claude | `docs/revisao/2026-11-15/07-navegador-stage.md` |

As duas revisões de código foram entregues primeiro ao Codex (gpt-5.6-sol/high). As duas pararam no meio porque **o crédito do Codex acabou**. Pela regra combinada, o Claude assumiu a parte dele. **O Codex ainda vai revisar este plano** quando o crédito voltar (protocolo de testes cruzados).

Base revisada: branch `fix/achados-testes-navegador` (PR #85, que traz os 10 achados de 2026-11-04). O navegador mostrou o stage, que ainda está na `develop` sem o #85. Tudo foi feito só com leitura, sem gravar nada no stage nem na produção.

## Placar

| Frente | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| UX público (UXP) | 0 | 3 | 9 | 16 |
| UX painel (UXA) | 0 | 7 | 24 | 16 |
| Código front (WEB) | 0 | 1 | 10 | 14 |
| Código backend (API) | 0 | 1 | 11 | 15 |
| Banco e segurança (BD, SEG) | 0 | 1 | 4 | 14 |
| Entrega e escopo (QA, FALTA) | 1 | 7 | 11 | 9 |
| Navegador (NAV) | 0 | 3 | 3 | 2 |

Severidade: **P0** quebra ou bloqueia; **P1** grave ou aparece na demonstração; **P2** médio; **P3** polimento. Algumas frentes acharam o mesmo problema; abaixo os repetidos aparecem juntos.

Verificação: lint, typecheck, knip e 339 testes unitários passam (api 107, web 192, core 40). E2E e testes de banco passaram no CI do #85. Nenhum segredo nem `service_role` no código ou no histórico do git.

## Resumo do que está errado

**Urgente agora**
- **A produção está pausada de novo** (Supabase gratuito, `INACTIVE` em 2026-11-15). O link de demonstração não carrega o cardápio. Nada avisa quando isso acontece. (FALTA-01, QA-08)
- **Dependências com falha de segurança conhecida:** `hono` 4.13.14 (um aviso faz o middleware curinga ser pulado, e o painel usa `.use('*', requireAdmin)`; a RLS segura no banco), `@hono/node-server` 2.1.5 e `next` 16.4.3. O PR #86 do Dependabot corrige e está verde desde 09/11. (QA-02)
- **Produção sem backup nenhum**, e o workflow aplica migration sem dump antes. (BD-01, FALTA-10)
- **O workflow de migrations fica verde sem fazer nada**: os segredos nunca foram cadastrados. O README diz o contrário. (QA-01, SEG-02, SEG-03)

**O que aparece numa demonstração**
- Formulários da Loja, dos Destaques e das Categorias **apagam o que foi digitado** quando o servidor recusa (React 19 reinicia campos não controlados). (WEB-01, UXA-05)
- Produto diz **"Disponível agora" com a loja fechada**. (UXP-04, NAV-01)
- **Subir/descer leva de 1 a 3 s**: de 10 a 14 idas ao Supabase por clique, sessão validada várias vezes, layout inteiro renderizado de novo, e a função provavelmente roda nos EUA (sem `regions` no `vercel.json`) com o banco em São Paulo. (UXA-03, WEB-05)
- A **logo do topo aparece atrasada** (`lazy`, pede w=3840 para mostrar 79 px). (WEB-04, NAV-02, UXP-18)
- A **Início é renderizada a cada visita** só por ler `searchParams` de uma prévia de desenvolvimento, e é a página que abre pelo QR/NFC. (UXP-01, WEB-02)
- Quase todos os produtos e o carrossel usam a **gota de reserva** no lugar de foto; conteúdo de produção com nomes de teste ("Coixinha", "Chilveski"), Info sem contato, nenhum destaque com foto. (NAV-03, FALTA-04)
- Editor de produto: trocar só categoria, selo ou situação **não pede confirmação ao sair**; erro sem foco no campo; vídeo inválido só é recusado depois de o produto ser criado; setas nunca ficam apagadas no início ou no fim. (UXA-06 a UXA-09)
- Ícones de categoria errados na Início (Pastéis vira biscoito da sorte, outras caem no genérico). Link sem prévia no WhatsApp fora da página de produto. (UXP-03, UXP-02)
- "Tentar novamente" da tela de erro não busca os dados de novo (`reset` no lugar de `retry`, conferido na doc do Next 16), e o painel não tem tela de erro própria. (UXP-05, WEB-08, UXA-27)
- "Ligar" monta `tel:` sem o `+`; nome e frase da loja editados no painel não aparecem no site; "Mais pedidos" pode mostrar indisponíveis. (UXP-06 a UXP-08)

**Código e arquitetura**
- **O vídeo passa por cima da API**: rota de 321 linhas no Next acessando o Supabase direto, com outra autorização, e a regra "apagar mídia sem uso" repetida em 6 lugares. (API-01, API-13, WEB-06)
- Upload: o timeout de 15 s não cancela o trabalho (a foto pode trocar depois do 504), corrida entre dois envios deixa arquivo órfão, WebP pode passar do limite do bucket, HEIC aceito mas não decodificado (vira 500), sem limite de pixels. (API-02 a API-05, API-12)
- Trocar o produto de categoria mantém o `sort_order` antigo: com posição repetida, subir/descer responde sucesso e não move nada. (API-07, BD-03)
- Códigos HTTP errados: 409 em vez de 404, 500 em vez de 400 para categoria apagada e preço acima do limite. (API-06, API-08, API-09, BD-04)
- Cache: `revalidatePath('/', 'layout')` expira o site inteiro no vídeo; a tag `product:<id>` nunca acerta; destaque grava `/produto/<uuid>` e gera 308. (WEB-03, WEB-07)
- Sessão vencida nas ações diz "não permite esta alteração", sem caminho para entrar de novo. (WEB-11, UXA-10)
- **Nenhum teste de componente**; rotas de escrita sem teste de 401/403; pisos de cobertura de 12 a 19 pontos abaixo do real; E2E com esperas fixas; o Playwright local grava no **stage**; um `test.skip` esconde a gaveta do destaque encoberta no Pixel 7. (WEB-09, QA-03 a QA-06)

**Segurança e banco, sem falha explorável**
- Admin sem MFA (o TOTP do Supabase é gratuito); mudanças em `profiles` fora da auditoria; cookie de sessão de 400 dias legível por JavaScript (padrão do `@supabase/ssr`); rotas públicas sem limite de requisições; Dockerfile como root. (SEG-01, BD-02, SEG-04, SEG-05, SEG-09)

**Documentação desatualizada**
- README (script `api-fora-do-ar.sh`, 306 testes, CI antigo, tabela de migrations), `guia-da-equipe.md` (vídeo de 10 MB, "Desativar"), `publicacao-producao.md` (parado em 10/10), notas 03, 06, 07 (`price` em vez de `price_cents`, slug único global), 08, 09, 12, 13 e 14.

**Limpeza**
- Fechar os PRs #72 e #73 (substituídos pelo #74 e pelo #80); decidir o #62; apagar cerca de 14 branches remotas resolvidas; excluir o projeto `salgae-api-stage` na Vercel e depois remover `apps/api/src/index.ts`, `apps/api/vercel.json` e a entrada `index` do build.

## O que falta fazer

- Teste em **celular real** (iPhone e Android): nunca foi feito. Os QR codes do stage e da produção estão em `docs/qr/`.
- **Roteiro de demonstração**: ordem das telas e o que mostrar no painel (mudar preço e ver no cardápio, enviar foto, esconder produto, fechar a loja).
- **Conteúdo de exemplo convincente** na produção, com fotos de verdade e contato de exemplo na Info.
- Ping agendado que mantém os dois bancos ativos e avisa quando caem, mais backup semanal da produção.
- Decisões em aberto na nota 03: contato do cliente com a equipe (WhatsApp ou chamar atendente), indisponível some ou esmaece, papéis de acesso.
- Painel: recuperar senha, rascunho ou desfazer, duplicar produto. São sugestões, não promessas do escopo.
- As ideias 20, 21 e 26 e os pacotes 1, 3, 4 e 5 da nota 24 seguem **só no planejamento**, por decisão do responsável.

## Plano de ação

Cada onda vira um PR para a `develop`. Divisão padrão: **o Codex escreve o código**; **o Claude orquestra**, cuida de CI e Vercel, testa no navegador e revisa. Toda execução é revisada e testada pelo outro antes do merge ([[11-Agentes-de-IA]]). Produção, `main` e exclusões ficam com o "sim" do responsável.

### Andamento (atualizado em 2026-11-18)

Tudo abaixo está na `develop` (e no stage). A produção continua na promoção de 2026-11-04 (PR #83) e recebe estas ondas na próxima promoção, com o "sim" do responsável.

| Onda | Status | PRs |
| --- | --- | --- |
| 0 — destravar | **Quase toda feita.** Faltam decidir o #62, excluir `salgae-api-stage` e subir o `next` para 16.4.6 (está em 16.4.5). | #85, #86 |
| 1 — o que aparece na demonstração | **Feita.** | #89, #90, #91 |
| 2 — backend firme | **Quase toda feita.** Faltam o destaque gravando o slug (WEB-07) e a sessão vencida levando ao login (WEB-11, UXA-10). | #92, #94 |
| 3 — segurança e operação | **Em parte.** Feitos: ping, cópia semanal, migrations sem verde falso, `npm audit` no CI e Docker sem root. Faltam: segredos (responsável), aprovação de ambiente no workflow, auditoria de `profiles`, cabeçalhos e a decisão sobre MFA. | #88 |
| 4 — UX do painel e do público | **Feita.** A migration do destaque que segue o slug (20261116120000) está na `develop`, mas ainda não foi aplicada no stage nem na produção. | #101, #106, #107 |
| 5 — testes e qualidade | **Feita.** Testes de componente, pisos de cobertura, E2E sem esperas fixas e a gaveta no Pixel 7 sem `skip` (a causa era a lista alargando a página com nome longo). Falta só conferir num celular real. | #92, #93, #100, #108 |
| 6 — pronto para demonstrar | **Em parte.** Produção restaurada em 2026-11-15 e roteiro de demonstração em `docs/publicacao-producao.md` (onda 7). Faltam conteúdo de exemplo, teste em celular real e a promoção. | — |
| 7 — documentação e limpeza | **Feita.** | #104 |
| 8 — polimento | **Feita no que cabia em P.** Os P3 de esforço M/G, que mudam conteúdo/fluxo, pedem migration/RLS/workflow ou ação externa ficaram adiados (lista na seção da onda 8). | #110 |

### Onda 0: destravar (já)

| Item | Quem | Depende de | Status |
| --- | --- | --- | --- |
| Restaurar `SALGAE-PRODUCTION` e conferir `/api/health` e `/cardapio` | Claude | "sim" do responsável | **Feito** em 2026-11-15 |
| Revisão final do Codex no #85, conferência do painel no stage e merge na `develop` | Codex revisa, Claude junta | crédito do Codex; login do responsável para o painel | **Feito**: #85 na `develop` em 2026-11-15 |
| Merge do #86 (hono, next) e subida do `next` para 16.4.6 | Claude | CI verde | **Em parte**: #86 na `develop`; o `next` está em 16.4.5 |
| Fechar #72 e #73; decidir #62; apagar branches resolvidas | Claude | "ok" para o #62 | **Em parte**: #72 e #73 fechados e a maior parte das branches antigas apagada; o #62 segue aberto |
| Excluir `salgae-api-stage` na Vercel; depois o PR que tira os arquivos legados | Responsável, depois Claude | exclusão feita por ele | Pendente |

### Onda 1: o que aparece na demonstração (P1) — feita (#89, #90, #91)

- Formulários que não apagam o que foi digitado (WEB-01, UXA-05).
- Editor de produto: estado "alterado" com os chips, foco e mensagem no campo com erro, vídeo validado antes de criar, setas apagadas no início e no fim (UXA-06 a UXA-09).
- Subir/descer rápido: região `gru1` na Vercel, `cache()` na sessão, lista que se move na hora, sem renderizar o layout de novo (UXA-03, WEB-05).
- Site público: "Disponível agora" respeitando a loja fechada, Início estática, logo com `preload` e `sizes`, ícones de categoria, Open Graph em todas as páginas, `retry` na tela de erro e tela de erro do painel, `tel:` com `+`, nome e frase da loja no site, "Mais pedidos" só com disponíveis (UXP-01 a UXP-08, WEB-02, WEB-04, WEB-08, UXA-27).

Quem: Codex escreve; Claude testa no navegador em 375 px e 1280 px e revisa. Esforço: médio, de 2 a 3 PRs.

### Onda 2: backend firme e camadas no lugar — quase toda feita (#92, #94)

- Vídeo para dentro da API, com uma única regra de mídia sem uso (API-01, API-13, WEB-06).
- Upload: cancelar de verdade no timeout, update condicional contra corrida, conferência do limite do bucket, HEIC recusado com mensagem clara, limite de pixels (API-02 a API-05, API-12).
- `sort_order` ao trocar de categoria, com migration e teste de banco (API-07, BD-03).
- Códigos HTTP corretos e teto de preço (API-06, API-08, API-09, BD-04); `requireAdmin` por repositório e sem `catch {}` mudo (API-10, API-11).
- Cache por tag no lugar de `revalidatePath('/', 'layout')`; destaque gravando o slug (WEB-03, WEB-07).
- Sessão vencida levando ao login com o motivo e de volta à tela (WEB-11, UXA-10).

Quem: Codex escreve; Claude revisa e testa no stage. Esforço: grande, de 3 a 4 PRs.

### Onda 3: segurança e operação — em parte (#88)

- Workflow agendado: ping em `/api/health` dos dois ambientes, com aviso quando cair, e `pg_dump` semanal da produção guardado como artefato (QA-08, BD-01).
- Workflow de migrations: falhar quando faltar segredo, restringir à `main` e exigir aprovação do ambiente (QA-01, SEG-02, SEG-03). Os segredos o responsável cadastra.
- `npm audit` no CI; auditoria de `profiles`; cabeçalhos que faltam; Dockerfile sem root (QA-02, BD-02, SEG-09).
- MFA (TOTP) para o admin: **decisão do responsável** (SEG-01).

Quem: Claude (CI e Supabase); Codex revisa. Esforço: médio.

### Onda 4: UX do painel e do público (P2) — feita (#101, #106, #107)

Voltar do navegador com aviso ou rascunho (UXA-01), menu "⋯" com `popover` (UXA-02), prévia do produto sem link (UXA-04), mensagens de upload em português e limites visíveis antes de escolher (UXA-11, UXA-12), nomes únicos para a situação (UXA-18), aviso ao esconder categoria com produtos (UXA-21), slug fora da vista do dono (UXA-22), atalho "Ver cardápio" no celular (UXA-28), "Fechado" visível na Loja (UXA-31), botão de pausar o carrossel (UXP-09), carregamento nas rotas públicas (UXP-10), primeira tela com preço em celular baixo (UXP-11). O restante dos P2 está nos relatórios 01 e 02.

Quem: Codex escreve; Claude testa no navegador. Esforço: grande.

### Onda 5: testes e qualidade — feita (#92, #93, #100, #108)

Testes de componente no `apps/web`; 401/403 em todas as rotas de escrita; pisos de cobertura perto do real; E2E sem esperas fixas e sem seletor por classe; Playwright local sem gravar no stage; corrigir a gaveta no Pixel 7 e tirar o `test.skip`; dois testes que conferem implementação reescritos (WEB-09, WEB-24, QA-03 a QA-06).

Quem: o Codex propõe os testes dele e o Claude valida; o Claude propõe os de navegador e banco e o Codex valida.

### Onda 6: pronto para demonstrar — em parte

- Conteúdo de exemplo na produção, com backup antes: fotos reais dos produtos e dos destaques, nomes corrigidos, Info com contato de exemplo, ordem das categorias. Precisa do responsável: fotos ou "ok" para usar fotos de banco de imagens.
- Teste em celular real pelos QR codes (responsável), com o roteiro `docs/testes/epico-5-roteiro-celular.md`.
- Roteiro de demonstração e checklists de `docs/publicacao-producao.md` marcados.
- Promoção da `develop` para a `main`, só com o "sim" dele.

### Onda 7: documentação e limpeza — branch `docs/onda7-documentacao`

README, guia da equipe, `publicacao-producao.md`, notas 03, 06, 07, 08, 09, 12, 13 e 14; `.prettierignore`, `.vercelignore` e `.gitignore`; aviso do Vite sobre ESM no `apps/web`. Quem: Claude escreve; Codex confere com o código.

Na branch `docs/onda7-documentacao` (2026-11-16): README, guia da equipe, `publicacao-producao.md` (agora roteiro de publicação e de demonstração), `migrations-pelo-ci.md`, notas 03, 05, 06, 07, 08, 09, 12, 13, 14, 15, 16, 25 e esta; `.gitignore`, `.prettierignore` e `.vercelignore` (LIMP-05, LIMP-06); `vitest.config.mts` no `apps/web` (QA-11); títulos de teste em português (QA-13). A conferência do Codex fica para quando ele revisar o PR.

### Onda 8: polimento (P3) — feita (#110)

Os P3 dos relatórios, agrupados por tela, quando as ondas anteriores estiverem na `develop`.

Feito em 2026-11-18 (#110, código do Codex, revisão do Codex aprovada): selo do produto com a cor do card (UXP-20); status da loja "Sem informação", gaveta do atalho que limpa `?nova`/`?novo`, remover foto com vídeo explicando o bloqueio, `Input` com id próprio (WEB-14, WEB-18); API-18, API-19 (envelope de erro único), API-20 (requestId), API-22, API-25, API-27, SEG-05 (cache público de 60 s) e `upgrade-insecure-requests` na CSP com site https (SEG-10).

Adiados: UXP-22 (falta arte para ícone `maskable`); UXA-33 a 36, 38 a 43 e 48; WEB-12, 13, 15 a 17 e 19 a 24; API-13, 16, 17, 21, 24 e 26; BD-05, 06 e 08; BD-07 (a CLI do CI gera `ComputedFields` e `NonNullable<Json>`: a comparação inteira dos tipos pede regenerar `database.types.ts` com a mesma versão); SEG-03, 04, 06 e 08 (com o cadastro desligado no Supabase local o E2E não cria o token de cliente; precisa de usuário comum na fixture); QA-09, 10, 12 e 14; LIMP-02, 03 e 07 a 09; FALTA-12. Sugestões da revisão para depois: levar o `requestId` ao `ApiRequestError` e registrar que o cache da `/api` pública pode mostrar dado antigo por até 60 s.

## Decisões que dependem do responsável

1. ~~"Sim" para restaurar a produção agora.~~ Feito: produção restaurada em 2026-11-15.
2. Excluir `salgae-api-stage` na Vercel.
3. Fotos para o conteúdo de exemplo: dele ou de banco de imagens.
4. Contato do cliente na demonstração: WhatsApp, "chamar atendente" ou nada.
5. MFA para o admin: sim ou não.
6. PR #62 (protótipo no Claude Design): juntar ou fechar.
7. Cadastrar os segredos do workflow de migrations, ou desligar o workflow por enquanto.
8. Promoção para a `main` no fim da onda 6.

Voltar: [[_Indice-03-Entrega-e-Operacao]] · [[Home]]

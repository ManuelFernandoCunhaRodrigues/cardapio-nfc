# Revisão de qualidade de entrega e escopo: Salgaê

Data: 2026-11-15 · Branch analisada: `fix/achados-testes-navegador` (PR #85) · Revisão só de leitura, sem nenhuma alteração no repositório.

Contexto que vale para tudo abaixo: o projeto é uma **demonstração para clientes**. O plano gratuito e a falta de domínio são decisões tomadas e não aparecem como problema. As ideias 20 (pedido pela mesa), 21 (usuários e rastreabilidade) e 26 (cardápio rápido e sem internet) existem no vault e são **só planejamento**, por decisão do dono. Os pacotes 1, 3, 4 e 5 da nota 24 (imagem ou vídeo nos destaques) também ficam registrados até o dono pedir.

Severidade: **P0** bloqueia a demonstração · **P1** precisa ser feito antes de apresentar · **P2** importante · **P3** melhoria.
Esforço: **P** até 1 h · **M** até 1 dia · **G** mais de 1 dia.

## Resumo executivo

1. **P0: a produção está pausada agora.** `SALGAE-PRODUCTION` aparece como `INACTIVE` no Supabase (consulta feita em 2026-11-15). O link "Demonstração" do README (<https://salgae-producao.vercel.app>) não carrega o cardápio. O stage está ativo.
2. **P1: o workflow Migrations não faz nada e mesmo assim fica verde.** Os segredos não estão cadastrados. A execução de 2026-11-04 avisou "Segredos do Supabase não configurados para producao" e terminou como `success`. O README diz que as migrations são aplicadas pelo CI.
3. **P1: há dependências com falha de segurança conhecida.** `npm audit` aponta `hono` 4.13.14 (5 avisos, entre eles um em que o middleware curinga é pulado, e a API usa `.use('*', requireAdmin)`) e `@hono/node-server` 2.1.5. O `next` 16.4.3 tem 7 avisos corrigidos na 16.4.5. O PR #86 traz as correções e está com o CI verde desde 2026-11-09.
4. **Os 10 achados do navegador estão corrigidos no PR #85** (CI verde), mas ainda não entraram na `develop` nem na `main`. Também falta conferir o painel no navegador com login.
5. **Lint, typecheck, knip e testes unitários passaram** (339 testes). Os pisos de cobertura estão 12 a 19 pontos abaixo do valor real.

---

## Qualidade de entrega

| ID | Sev. | Onde | Problema | Impacto | Ação sugerida | Esforço |
| --- | --- | --- | --- | --- | --- | --- |
| QA-01 | P1 | `.github/workflows/migrations.yml:76` | Sem `SUPABASE_ACCESS_TOKEN` e senhas, o job só emite um `::warning::` e termina como **success**. Todas as execuções até 2026-11-04 foram assim (`gh secret list` vazio). A verificação "PR para a main reprovado se a produção não tiver a migration" nunca rodou. | Dá um falso verde. Migration nova pode chegar à `main` sem estar na produção, e o README (l.231) e a nota 09 descrevem um processo que não acontece. | Cadastrar os 3 segredos e fazer o acerto único do histórico (`docs/migrations-pelo-ci.md`). Enquanto isso, falhar (`exit 1`) em `pull_request` para a `main` e em `push` na `main` quando faltar segredo. | M |
| QA-02 | P1 | `apps/api/package.json` (hono 4.13.14, @hono/node-server 2.1.5), `apps/web/package.json` (next 16.4.3), PR #86 | `npm audit --omit=dev` mostra 2 pacotes moderados. Um dos avisos do hono (GHSA-h7mg-cq63-vhpq) faz o RegExpRouter pular middleware curinga, e as rotas do painel usam `.use('*', requireAdmin(...))` (`products.routes.ts:19` e outras). A RLS atenua, porque a escrita usa o token do usuário. O Next 16.4.3 tem 7 avisos corrigidos na 16.4.5, e a 16.4.6 (release de segurança de novembro) já saiu. O CI não roda `npm audit`. | Risco de segurança em produção e ponto fraco numa apresentação técnica. | Fazer o merge do PR #86 e depois subir o `next` para 16.4.6 e o `hono` para 4.13.18. Adicionar `npm audit --omit=dev --audit-level=high` ao job `verify` e ligar os alertas de segurança do Dependabot. | P |
| QA-03 | P2 | `e2e/movimento/movimento-painel.spec.ts:155` | `test.skip` no `movimento-celular`: no Pixel 7, o formulário da gaveta do destaque fica encoberto e o botão "Criar destaque" não aparece ("pendência da E9", nota 25). | O teste esconde um defeito real de tela no celular, e o escopo diz "painel totalmente utilizável no celular". | Corrigir a gaveta (rolagem interna, `max-height: 100dvh`, rodapé fixo), tirar o `skip` e conferir num celular real. | M |
| QA-04 | P2 | `e2e/painel/categorias.spec.ts:198`, `e2e/painel/situacoes-e-rajadas.spec.ts:255` e `:295`, `e2e/painel/achados-navegador.spec.ts:228`, `e2e/movimento/movimento-publico.spec.ts:44` e `:92` | Esperas fixas (`waitForTimeout(1_000)`) para provar que um segundo POST não aconteceu, `waitForLoadState('networkidle')` (desaconselhado pelo Playwright), seletor por classe CSS (`.bg-peach`) e por estrutura (`locator('> div')`). | Testes lentos e frágeis: falso verde se a fila demorar mais de 1 s, e quebra quando o estilo muda. | Trocar por sinal observável: `expect.poll(moves.requests, { timeout })` depois de soltar o pedido, ou `data-state`/`aria-current` no lugar da classe. No teste de carregamento, segurar a rota antes do clique em vez de esperar `networkidle`. | P |
| QA-05 | P2 | `e2e/playwright.config.ts:6-10` e `e2e/fixtures.ts` | Fora do CI, o Playwright carrega `apps/web/.env.local`, que aponta para o **stage**. Rodar `npm run test:e2e` localmente cria produtos e categorias `E2E-*`, envia arquivos ao Storage e altera `store_settings` no stage. A limpeza só remove os ids rastreados. As variáveis `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` não estão no README nem no `.env.example`. Hoje o stage tem o produto **"QA Teste Excluir" ativo desde 2026-11-03**, que sobrou de um teste manual e aparece no cardápio do stage. | Sujeira no stage, que é o ambiente "com conteúdo de exemplo" citado no README. | Recusar a execução quando a URL do Supabase não for `127.0.0.1`/`localhost`, salvo com `E2E_ALLOW_REMOTE=1`. Documentar o passo a passo local. Apagar "QA Teste Excluir" do stage. | P |
| QA-06 | P2 | `apps/api/vitest.config.ts:16`, `apps/web/vitest.config.ts:22`, `packages/core/vitest.config.ts:14` | Os pisos de cobertura estão muito abaixo do real (medido agora). API: piso 70/65/75/70, real 83/77/84/83. Web: piso 51/49/65/52, real 67/63/69/69. Core: piso 52/51/68/53, real 71/78/70/71. | A cobertura pode cair 15 pontos sem o CI reclamar. | Subir os pisos para cerca de 2 pontos abaixo do real e revisar a cada épico. | P |
| QA-07 | P2 | Vercel `salgae-api-stage` (checks dos PRs #85 e #86) | O projeto antigo da API continua gerando build a cada PR, embora a nota 09 diga que "sai depois da validação no stage". | Builds à toa e confusão sobre qual projeto vale. | Excluir o projeto na Vercel (quem faz é o responsável) e depois fazer a LIMP-04. | P |
| QA-08 | P2 | Monitoramento (não existe) | Nada avisa quando a produção ou o stage param. A pausa atual da produção não foi percebida por nenhum alerta. | A demonstração pode cair sem ninguém saber. | Criar um workflow agendado (cron a cada 2 ou 3 dias) que faça `curl` em `/api/health` dos dois ambientes. Ele lê o banco, então também mantém o Supabase ativo, e falha (com e-mail do GitHub) se não responder. | P |
| QA-09 | P3 | `.github/workflows/ci.yml:1-12` e `:89` | O CI só roda em PR para `develop`/`main`: PR empilhado, como o #73, fica sem verificação. Os navegadores do Playwright são baixados a cada execução, sem cache. | O CI fica mais lento e o PR empilhado fica sem rede de proteção. | Incluir `pull_request` sem filtro de base (ou `branches-ignore`) e guardar `~/.cache/ms-playwright` em cache pela versão. | P |
| QA-10 | P3 | `.github/workflows/migrations.yml:99` | "Há pendência" é detectado pelo texto `Remote database is up to date` da CLI. | Se a mensagem mudar, a detecção quebra. A versão fixa 2.120.0 atenua. | Comparar `supabase migration list` com os arquivos, ou anotar no workflow que a versão está fixa por esse motivo. | P |
| QA-11 | P3 | `apps/web/vitest.config.ts` | O Vite avisa "ESM syntax in a file loaded as CommonJS" porque o `apps/web` não tem `"type": "module"`. | Ruído hoje e quebra quando o loader nativo virar padrão. | Renomear para `vitest.config.mts`. | P |
| QA-12 | P3 | `apps/*/tsconfig.json`, `packages/core/tsconfig.json`, `e2e/tsconfig.json` | Quatro tsconfigs repetem as mesmas opções, sem base comum e sem `noUncheckedIndexedAccess`. | Divergência ao longo do tempo. | Criar `tsconfig.base.json` na raiz com `extends`. Avaliar `noUncheckedIndexedAccess`. | M |
| QA-13 | P3 | `e2e/api/menu-publico.spec.ts:77-127` | Os nomes dos testes estão em inglês, contra a convenção do README (l.128): "Testes descrevem o comportamento numa frase em português". | Inconsistência visível para quem avalia o código. | Traduzir os títulos. | P |
| QA-14 | P3 | `.github/dependabot.yml` | Todas as versões maiores são ignoradas (ESLint 10, TypeScript 7 e outras). Faz sentido, mas não há registro do que ficou para trás. | Atraso silencioso. | Abrir uma issue "versões maiores pendentes" e revisar a cada mês. | P |
| QA-15 | P3 | `e2e/playwright.config.ts` | Sem `retries` no CI. É bom para não esconder instabilidade, mas não há relatório de testes instáveis. | Uma falha intermitente derruba o PR inteiro. | Manter sem `retries` e corrigir a QA-04. Se aparecer instabilidade, usar `retries: 1` só no CI, com `--fail-on-flaky-tests`. | P |

Pontos fortes que apareceram na revisão: o CI aplica todas as migrations num banco vazio, confere os tipos versionados, roda os testes SQL de RLS, a suíte E2E contra o build de produção, a imagem Docker da API e o teste de "banco fora do ar". As fixtures limpam o que criam, inclusive o Storage (`midia.spec.ts`). A CSP é conferida em todo teste. O knip roda no CI. O ESLint guarda as fronteiras entre camadas. A cobertura E2E já inclui categorias, destaques, loja, foto, vídeo, sessão expirada e rajadas de clique, que a nota 03 ainda dá como faltando.

---

## O que falta fazer

| ID | Sev. | Onde | Problema | Impacto | Ação sugerida | Esforço |
| --- | --- | --- | --- | --- | --- | --- |
| FALTA-01 | P0 | Supabase `SALGAE-PRODUCTION` (status `INACTIVE`) | A produção foi pausada pelo plano gratuito. | O link de demonstração não funciona agora. | Restaurar o projeto no painel do Supabase (quem faz é o responsável). Antes de **cada** demonstração, abrir a produção 1 dia antes. Ver QA-08 para evitar a pausa. | P |
| FALTA-02 | P1 | PR #85 (aberto, CI verde, 29 arquivos) | As correções dos 10 achados de 2026-11-04 não estão na `develop` nem na `main`. O próprio PR diz que falta ver o painel no navegador com login, e que o Codex apontou 3 bloqueios, corrigidos sem nova revisão dele. | A produção ainda mostra contagem errada no Resumo, perde alterações sem aviso, marca o chip de categoria errado e corta o selo do vídeo. | Conferir o painel no stage (prévia do PR) com login, pedir a revisão final do Codex, fazer o merge na `develop` e promover para a `main`. | M |
| FALTA-03 | P1 | PR #86 (Dependabot, CI verde) e a diferença `develop`/`main` | O PR #86 está aberto desde 2026-11-09. A `develop` tem o #84 (Subir/Descer) que a `main` não tem. | Correções de segurança e de experiência fora da produção. | Merge do #86, depois Next 16.4.6 (QA-02) e um PR de promoção `develop` → `main`, que também leva o #84 e o #85. | P |
| FALTA-04 | P1 | Conteúdo da produção (nota 16, "O que depende do responsável") | Produtos de teste "Coixinha" (com foto de geladeira) e "Chilveski". Categoria Bebidas escondida, com 4 produtos sumidos. Ordem das categorias bagunçada pelos cliques. Info sem endereço, telefone, WhatsApp e Instagram. Pela nota 24, nenhum destaque tem foto, então o carrossel aparece só com degradê. | Numa vitrine para clientes, é o primeiro detalhe que salta aos olhos. | Montar o conteúdo de exemplo da produção: nomes e fotos coerentes, Bebidas visível, ordem lógica, contatos fictícios plausíveis e pelo menos 3 destaques com foto. Guardar um SQL ou roteiro para restaurar esse conteúdo depois de uma demonstração ou pausa. | M |
| FALTA-05 | P1 | Notas 16 e 25, `docs/testes/epico-5-roteiro-celular.md`, decisão "Compactação automática de vídeo" | Nunca houve teste em celular real (iPhone e Android): painel, envio de foto e vídeo pela câmera, gaveta do destaque (QA-03), primeiro vídeo real enviado pelo celular em stage. | A demonstração costuma ser feita no celular do cliente e o painel "pelo celular" é um argumento de venda. | Rodar o roteiro do Épico 5 em pelo menos 1 iPhone e 1 Android (stage para gravar, produção só para ler) e registrar o resultado. | M |
| FALTA-06 | P1 | QA-01 | Os segredos do workflow Migrations e o acerto do histórico da produção estão pendentes desde 2026-10-13. | A promoção depende de alguém lembrar de aplicar a migration. | Cadastrar os segredos (responsável) e rodar uma vez em modo de conferência. | P |
| FALTA-07 | P2 | Nota 09, PRs #85 e #86 | O projeto Vercel `salgae-api-stage` ainda existe. | Ver QA-07. | Excluir o projeto e depois fazer a LIMP-04. | P |
| FALTA-08 | P2 | `docs/publicacao-producao.md` §0 e §7, nota 12 (checklist, l.51-60) | Os checklists de pré-requisitos e de pós-publicação estão todos em `[ ]`. Parte não se aplica (plano comercial, domínio, NFC físico), parte nunca foi conferida (inativo não aparece, rede móvel, rollback). | Não há prova de que a produção da demonstração passou pela checagem. | Marcar "não se aplica (demonstração)" no que for o caso e rodar o restante na produção depois da FALTA-01/02. | P |
| FALTA-09 | P2 | Não existe | Falta um **roteiro de demonstração**: ordem das telas, o que mostrar no painel (editar preço e ver no cardápio, enviar foto, esconder categoria), qual conta usar e como desfazer as alterações depois. | Apresentação improvisada, com risco de deixar sujeira na produção. | Escrever uma página curta (`docs/demonstracao.md` + nota no vault) com o roteiro, a lista "antes de apresentar" (Supabase ativo, conteúdo conferido, QR `docs/qr/salgae-producao-vercel-app.png` impresso) e "depois de apresentar". | P |
| FALTA-10 | P2 | `docs/publicacao-producao.md` §8 | Não existe backup da produção (o plano gratuito não tem backup diário, e o `pg_dump` manual nunca entrou na rotina). | Se o conteúdo de exemplo for perdido, é preciso refazê-lo à mão. | Cobrir junto com a FALTA-04: SQL versionado do conteúdo de demonstração, ou `pg_dump` guardado depois de montar o conteúdo. | P |
| FALTA-11 | P2 | Nota 03, "Decisões pendentes relevantes" | Seguem abertas: contato do cliente com a equipe (WhatsApp/chamar atendente), papéis de acesso, política visual, métricas anônimas, estoque/"Promoção". Duas já foram resolvidas e não saíram da lista: foto da categoria (feita no #81) e mídia nos destaques (só categoria, decidido em 2026-11-04). | O vault parece ter mais pendências do que realmente tem. | Fechar as resolvidas e marcar as demais como "fora da demonstração" ou "decidir com cliente real". | P |
| FALTA-12 | P3 | Nota 02, "Perguntas antes do lançamento" | As 5 perguntas (WhatsApp, indisponível some ou esmaece, quem acessa, horário, idioma) seguem sem resposta formal, embora o código já responda várias (indisponível esmaecido, horários, só pt-BR). | Documentação incoerente com o produto. | Registrar as respostas que o código já dá. | P |
| FALTA-13 | P3 | Nota 16, "Limite conhecido" | O botão Voltar do navegador dentro do painel não avisa sobre alteração não salva. | É aceito por decisão; só evitar esse caminho na demonstração. | Manter registrado e citar no roteiro (FALTA-09). | n/a |

**Existem e são só planejamento (não são pendência):** ideia 20 (pedido pela mesa, VPS), ideia 21 (usuários e rastreabilidade) e ideia 26 (cardápio rápido e sem internet), mais os pacotes 1, 3, 4 e 5 da nota 24 (teste de imagens e vídeo nos destaques). Esses pacotes só começam se o dono pedir.

---

## Documentação desatualizada

| ID | Sev. | Onde | Problema | Ação sugerida | Esforço |
| --- | --- | --- | --- | --- | --- |
| DOC-01 | P2 | `README.md:149` | Cita `e2e/scripts/api-fora-do-ar.sh` e diz que "o CI derruba a API". Hoje o script é `banco-fora-do-ar.sh` e o CI derruba o banco. | Corrigir o nome e a frase. | P |
| DOC-02 | P2 | `README.md:167`, `:169` e `:170` | Diz "306 testes (95/171/40)", mas são 339 (107/192/40). "125 execuções E2E contra os builds de produção da API e do site" e "sobe a API, faz o build do site lendo dela" descrevem a arquitetura antiga. Hoje a API roda dentro do site e o build lê o banco. | Atualizar os números (ou tirá-los, para não envelhecer) e a descrição do job. | P |
| DOC-03 | P2 | `README.md:231` e `:241-249` | A tabela de migrations para em 7 e faltam `20261014120000_audit_and_sort_order_triggers` e `20261014150000_product_slug`. A l.231 afirma que o CI aplica as migrations, o que não acontece (QA-01). | Completar a tabela e ajustar o texto até os segredos existirem. | P |
| DOC-04 | P2 | `README.md:5` | O link "Demonstração" aponta para uma produção pausada. | Resolver a FALTA-01. Opcional: avisar que o primeiro acesso pode demorar. | P |
| DOC-05 | P2 | `docs/guia-da-equipe.md:29` | Vídeo "MP4 ou WebM, até 10 MB". Hoje o painel aceita MP4, MOV e WebM de até 50 MB e compacta. | Atualizar. | P |
| DOC-06 | P2 | `docs/guia-da-equipe.md:34`, `:39`, `:44` e `:48` | "Desligue Ativo", "Desativar", "desative". O painel agora usa a situação única (No cardápio, Indisponível, Escondido) e o verbo "Esconder", padronizado no PR #85. | Reescrever com os termos atuais e a foto da categoria. | P |
| DOC-07 | P2 | `docs/publicacao-producao.md:5-17` e `:32-38` | Estado congelado em 2026-10-10/11 ("5 migrations", "Hobby não permite uso comercial" como pré-requisito). Não cita a API dentro do site, o Ignored Build Step da produção (`[ "$VERCEL_ENV" != "production" ]`) nem o workflow Migrations sem segredos. | Reescrever como roteiro da demonstração (estado atual, o que não se aplica, promoção pelo workflow). | M |
| DOC-08 | P2 | Vault `03-Decisoes-do-Projeto.md` (atualizado 2026-10-13) | Falta a decisão de 2026-11-03 (um projeto Vercel por ambiente, API embutida, vídeo no Next em definitivo). A entrada de 2026-10-23 ainda diz "API como segundo projeto na Vercel". Em "Banco local no CI", diz que foto, vídeo, categorias, destaques e loja não têm E2E, mas hoje têm. Em "Página de produto", diz que o endereço continua sendo o identificador, mas o slug foi feito em 2026-10-14. | Acrescentar a decisão de 2026-11-03, marcar as entradas superadas e atualizar a data. | P |
| DOC-09 | P2 | Vault `06-Arquitetura-e-Stack.md:15`, `:39` e `:40` | Diz que a API não tem projeto na Vercel e depende da E1/E9. Desde 2026-11-03 ela roda dentro do site. | Atualizar. | P |
| DOC-10 | P3 | Vault `07-Modelo-de-Dados-Supabase.md:17-18` | `products.price` (o real é `price_cents`). Faltam `products.slug` e a foto de categoria. | Atualizar a tabela a partir de `packages/core/src/database/database.types.ts`. | P |
| DOC-11 | P3 | Vault `09-Ambientes-e-Deploy.md` | "Antes do lançamento, avaliar o plano Pro" contradiz a decisão de manter tudo gratuito. "`salgae-api-stage` sai depois da validação" está pendente (FALTA-07). | Trocar por "pausa automática: reativar antes de demonstrar" e registrar a exclusão do projeto quando acontecer. | P |
| DOC-12 | P3 | Vault `16-Achados-dos-Testes-no-Navegador.md` | Não diz que os 10 itens e os testes novos estão no PR #85. | Acrescentar uma coluna ou linha de status (PR #85 e depois a promoção). | P |
| DOC-13 | P3 | Vault `25-Mudanca-Separar-Backend-e-Frontend.md:65` e `:67` | "Falta promover para a produção" (Next 16.4.2), mas a produção já está na 16.4.3. A "Fase 2" aparece como em andamento, mas foi concluída com o #74 e o #80. | Fechar o status. | P |
| DOC-14 | P3 | Vault `13-Roadmap.md` e `14-Epicos-de-Desenvolvimento.md` (atualizados em 2026-10-08/09) | Não há status por fase ou épico. A Fase 6 e o Épico 6 falam em lançamento no estabelecimento, NFC físico e orientação da equipe, o que não combina com o propósito de demonstração. | Marcar feito, parcial ou não se aplica em cada fase, com links para os PRs. | P |
| DOC-15 | P3 | Vault `05-Painel-Administrativo.md:45` e `:52`, `15-Operacao-e-Manutencao.md` (2026-09-26) | O painel ainda é descrito com "ativo e disponibilidade" separados. A rotina de operação foi escrita para uma loja real. | Atualizar os termos e incluir a rotina "antes e depois de uma demonstração". | P |

---

## Limpeza

| ID | Sev. | Onde | Problema | Ação sugerida | Esforço |
| --- | --- | --- | --- | --- | --- |
| LIMP-01 | P2 | PRs #72 e #73 | São da fase 2 (monorepo e `src/` por funcionalidade, de 2026-10-29). Foram substituídos pelo #74 (estrutura completa) e pelo #80 (API dentro do site), já na `develop`. Os checks da Vercel falharam e o #73 é empilhado sobre o #72. | Fechar os dois com um comentário apontando o #74 e o #80. | P |
| LIMP-02 | P3 | PR #62 | Só documentação (nota 18, protótipo no Claude Design), CI verde, aberto desde 2026-10-16. O conteúdo **não** está na `develop`. | Se o protótipo do Claude Design ainda é a referência (é o que diz a memória do projeto), atualizar com a `develop` e fazer o merge. Se não, fechar. | P |
| LIMP-03 | P3 | Branches remotas | Continuam no GitHub branches de PRs já resolvidos: `chore/promocao-producao`, `dependabot/.../correcoes-e-melhorias-48db1aeaa6` (#76), `docs/decisao-dois-projetos` (#79), `docs/ideia-cache-offline` (#68), `docs/nota-09-sem-previa` (#78), `docs/registro-ideia-usuarios` (#23, fechado), `feat/animacao-botao-login` (#82), `feat/imagem-nas-categorias` (#81), `fix/subir-descer-com-resposta` (#84), `refactor/dois-projetos` (#80), `refactor/estrutura-completa` (#74), `stage/e9-previa`. Mais `refactor/monorepo-apps-web` e `refactor/web-por-funcionalidade` depois da LIMP-01. Localmente há também `stage/e2…e9`, `refactor/*` e outras. | Apagar e ligar "Automatically delete head branches" no repositório. | P |
| LIMP-04 | P2 | `apps/api/src/index.ts`, `apps/api/vercel.json`, `apps/api/scripts/build.mjs:15` | São sobras do projeto `salgae-api-stage` (export default do Hono para Vercel Functions). O Docker usa `dist/server.js` e o site usa `embedded.ts`. O knip não aponta porque `src/index.ts` é entrada padrão. | Depois da FALTA-07, apagar os dois arquivos e a entrada `index` do build. | P |
| LIMP-05 | P3 | `.gitignore:8` e `:10` | `.vercel` aparece duas vezes. | Tirar a duplicada. | P |
| LIMP-06 | P3 | `.prettierignore:19-20`, `.vercelignore:9` | O `.prettierignore` aponta para `apps/web/src/lib/supabase/database.types*.ts`, que não existem mais (foram para `packages/core/src/database/`). O `.vercelignore` cita `playwright.config.ts` na raiz (hoje fica em `e2e/`, já coberto) e `apps/web/public/_e2e`, que não existe. | Atualizar os caminhos. | P |
| LIMP-07 | P3 | Pastas locais `test-results/` (vazia, de 2026-10-14), `.agents/` (vazia), `materiais/` | Não estão versionadas (o `.gitignore` cobre `test-results/` e `materiais/`), então não é problema de repositório. São só restos na pasta. A `materiais/` guarda fotos e vídeos de apoio. | Apagar `test-results/` e `.agents/` da máquina. Manter `materiais/` fora do Git, como está. | P |
| LIMP-08 | P3 | `docs/testes/` (cerca de 40 arquivos de plano e validação por épico), `docs/planejamento/` (11), `docs/testes/lighthouse/execucao.log` e `resumo.json` (da homologação antiga) | É histórico de processo misturado com documentação viva. Para quem avalia o repositório, é muito ruído. | Mover os planos e validações já concluídos para `docs/historico/` (ou anexos do vault), deixando em `docs/testes/` só os resultados atuais. Refazer ou remover a medição Lighthouse antiga. | M |
| LIMP-09 | P3 | Dependências | O knip não acusa nada sem uso. Patches e minors desatualizados: `next` 16.4.6, `hono` 4.13.18, `@hono/node-server` 2.1.8, `motion` 14.14, `@playwright/test` 1.65.1, `vitest` 5.1, `tailwindcss` 4.3.5, `supabase-js` 2.119. Versões maiores paradas: ESLint 10, TypeScript 7. | O #86 resolve a maior parte. O resto, ver QA-02 e QA-14. | P |
| LIMP-10 | P3 | `Salgae_Lanchonete_Obsidian/99-Anexos/` | Pasta vazia. | Apagar ou usar na LIMP-08. | P |

---

## Resultados de lint/typecheck/testes/knip

Rodados na raiz em 2026-11-15, na branch `fix/achados-testes-navegador`:

| Comando | Resultado | Tempo |
| --- | --- | --- |
| `npm run lint` | OK nos 4 workspaces (api, web, core, e2e), sem erros nem avisos | 1 min 35 s |
| `npm run typecheck` | OK nos 4 workspaces | 56 s |
| `npm run knip` | OK, nada sem uso | 15 s |
| `npm test` | **339 testes passaram**: api 107 (20 arquivos), web 192 (39), core 40 (13). Único aviso: o Vite reclama de ESM num arquivo carregado como CommonJS (`apps/web/vitest.config.ts`, QA-11) | 1 min 14 s |
| `npm run test:coverage` (extra, para conferir os pisos) | Todos acima do piso. API 83,0 / 77,1 / 84,3 / 83,3 %. Web 67,0 / 63,5 / 68,7 / 69,1 %. Core 71,3 / 78,0 / 69,6 / 71,2 % (instruções / ramos / funções / linhas) | cerca de 1 min 30 s |
| `npm audit --omit=dev` (extra) | 2 moderados: `hono` ≤ 4.13.15 e `@hono/node-server` 2.0.0–2.1.5 (QA-02) | n/a |

Não rodados: E2E e testes de banco, porque precisam de Docker e do Supabase local. No CI do PR #85, os jobs `verify` e `banco local e ponta a ponta` passaram.

Também consultado (só leitura): no Supabase, a produção está `INACTIVE` e o stage `ACTIVE_HEALTHY`. O stage tem 12 produtos, 6 categorias e 4 destaques, e o único resto de teste é "QA Teste Excluir". O conteúdo da produção não pôde ser conferido porque o banco está pausado.

## Ordem sugerida para a demonstração ficar redonda

1. Reativar a produção (FALTA-01) e criar o ping agendado (QA-08).
2. Conferir o painel do PR #85 com login, fazer o merge do #85 e do #86 e subir o Next para 16.4.6 (FALTA-02/03, QA-02).
3. Promover `develop` → `main`.
4. Montar o conteúdo de exemplo da produção e guardar um backup dele (FALTA-04/10). Apagar "QA Teste Excluir" do stage.
5. Teste em celular real e correção da gaveta do destaque (FALTA-05, QA-03).
6. Roteiro de demonstração e checklists marcados (FALTA-08/09).
7. Ajustar README, guia da equipe e vault (DOC-01 a DOC-08) e fazer a limpeza de PRs, branches e arquivos (LIMP-01 a LIMP-04).

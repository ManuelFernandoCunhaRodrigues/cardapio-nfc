# Plano — Playwright ampliado, separação backend/frontend e Motion

Status: **versão 2, revisada pelo Codex, aprovada pelo responsável em 2026-10-23.** Base: nota 25 do vault (`02-Tecnologia/25-Mudanca-Separar-Backend-e-Frontend.md`).

## Decisões do responsável (2026-10-23)

1. **Separação:** monorepo com API própria — `apps/web` (Next.js, só tela), `apps/api` (API Node
   com Hono, regras e acesso ao Supabase) e `packages/core` (validações, tipos e regras comuns).
   O Supabase continua como banco, login e arquivos.
2. **Hospedagem da API:** segundo projeto na Vercel Hobby (stage e produção), sem custo, com
   Dockerfile pronto para levar a uma VPS quando um cliente fechar.
3. **Ordem:** Playwright → separação → Motion.

## Regras que valem para todas as fases

- Cada fase vira PRs pequenos para a `develop`, cada um deixando o CI verde e o site
  funcionando.
- Claude orquestra (branch, npm, Vercel/Supabase stage, navegador, PR, merge na `develop`);
  Codex escreve o código; testes cruzados (cada um valida a ideia dos testes do outro antes de
  rodar).
- Produção (merge na `main`, migration em produção, configuração dos projetos de produção na
  Vercel) só com "sim" explícito do responsável.
- Sem plano pago, sem domínio. Nada de `git add -A`.
- Toda decisão nova vai para a nota 25 do vault.

---

## Fase 1 — Playwright ampliado (rede de segurança)

Objetivo: cobrir os fluxos que a separação vai mexer, **antes** de mexer. Vitest continua para
as regras puras.

**Hoje:** 8 testes no cardápio (celular) e 5 no painel (desktop), um worker, contra `next start`
com Supabase local no CI.

**PR 1.1 — estrutura + CRUD do painel**

- Projeto `setup` que faz login uma vez e salva `storageState`. O teste de "sair" usa login
  próprio (sair invalida a sessão salva e quebraria os testes seguintes).
- Fixtures comuns (`e2e/fixtures.ts`): admin logado, nome único por teste, relógio congelado
  (`page.clock`) nos testes de horário da loja.
- Pastas: `e2e/publico/`, `e2e/painel/`, `e2e/api/` (vazia até a Fase 2).
- **Um projeto canônico faz as alterações de dados** (painel desktop). Os outros projetos
  (cardápio desktop, painel celular) só conferem tela e responsividade, sem gravar — o banco é
  compartilhado e um worker só não desfaz alterações.
- Fluxos novos:

| Área | Testes |
| --- | --- |
| Categorias | criar, editar, reordenar, apagar (vazia) e bloqueio ao apagar com produtos |
| Destaques | criar, ativar/desativar, reordenar; aparece e some do carrossel do cardápio |
| Loja | abrir/fechar manual e horário (relógio congelado) → selo no cardápio e na Info |
| Produtos | editar preço e descrição, excluir, renomear mantém o endereço antigo (o slug não muda de propósito) |
| Cache | depois de alterar no painel, um contexto novo do navegador já vê o cardápio atualizado |
| Formulários | aviso de sair sem salvar; erros de validação por campo |

**PR 1.2 — mídia e acessibilidade**

- Enviar foto (arquivo de teste pequeno) e ver no cardápio; enviar vídeo curto (mp4 de teste) e
  ver compactado.
- `@axe-core/playwright` nas telas principais (início, produto, busca, login, painel) — falha
  só em violações sérias/críticas.
- `reducedMotion: 'reduce'` no carrossel (prepara a Fase 3).

**Fora:** comparação de imagem (screenshot) — instável entre máquinas e o CI.

**Pronto quando:** tudo verde no CI, job de E2E abaixo de ~12 min, cada fluxo acima com pelo
menos um teste.

---

## Fase 2 — Separação backend/frontend

### Arquitetura alvo

```
navegador ──► apps/web (Next.js, Vercel)
   │             Server Components e Server Actions = "BFF"
   │             (tela, sessão do login, revalidação de cache)
   │             ▼  servidor→servidor, Authorization: Bearer <token do usuário>
   │          apps/api (Hono, Node, Vercel; Dockerfile para VPS)
   └── vídeo ──►  (única chamada direta do navegador, ver decisão 1)
                  │  validação (zod do packages/core), regras, autorização, ffmpeg
                  ▼
               Supabase (Postgres + RLS, Auth, Storage)

packages/core: validators (zod), tipos do banco, contrato da API (schemas + cliente tipado),
               preço/slug, horários da loja, constantes de mídia.
```

### Decisões técnicas (revisadas com o Codex)

1. **Navegador fala com o web; o web fala com a API.** Server Actions viram uma camada fina que
   chama a API de servidor para servidor: sem CORS, CSP igual, revalidação continua no Next.
   **Exceção: o processamento de vídeo.** Passar pelo web faria duas funções esperarem o ffmpeg
   ao mesmo tempo (o dobro do tempo de função). O navegador chama
   `POST /v1/midia/video` direto, com o token do usuário; a API aceita CORS só da origem do web
   e a CSP ganha a origem da API em `connect-src`. Depois do vídeo, o navegador chama uma Server
   Action leve só para revalidar o cache.
2. **Sem chave `service_role`.** A API valida o token no Supabase Auth e cria **um cliente novo
   por requisição** com esse token (nunca um cliente compartilhado). A RLS continua sendo a
   última barreira; a API também confere `profiles.role = admin` e `is_active`.
3. **Login continua no Next** (`@supabase/ssr`, `proxy.ts` só em `/admin`). Um helper único no
   web: um cliente por chamada → `getUser()` (valida e renova) → `getSession()` (token já
   renovado) → chamada à API; sessão ausente vira "faça login de novo". Nada de ler ou decodificar
   cookie à mão.
4. **Contrato executável:** prefixo `/v1`, JSON, erros no formato atual, `request-id` em toda
   resposta, schemas zod e cliente tipado no `packages/core`, testes de contrato. OpenAPI é
   opcional.
5. **npm workspaces** com `packageManager` na raiz, nomes únicos (`@salgae/web`, `@salgae/api`,
   `@salgae/core`) e dependência interna declarada em cada app (a Vercel usa isso para saber o
   que reconstruir).
6. **Fronteira garantida em três camadas:** `package.json` do web sem `ffmpeg-static`/`sharp`;
   `no-restricted-imports` (web não importa `@supabase/supabase-js` fora do login; API não
   importa React/Next); regra por pasta no ESLint.
7. **Variáveis:** web → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (login),
   `API_URL` (build e execução), `NEXT_PUBLIC_API_URL` (só para o vídeo),
   `NEXT_PUBLIC_SITE_URL`. API → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WEB_ORIGIN` (CORS; não
   autentica nada — quem autentica é o token). Nenhum segredo novo.
8. **API fora do ar não pode estragar o cardápio.** Hoje a leitura engole o erro e a página
   guarda a tela de erro no cache. Com a API: no build e na revalidação o erro é **lançado** —
   o build falha (em vez de publicar tela de erro) e a revalidação mantém a última versão boa.
9. **Atualização imediata, com cache por etiqueta.** Continua aparecendo na hora no cardápio,
   mas em vez de `revalidatePath('/', 'layout')` em toda alteração, cada leitura ganha uma
   etiqueta (`cardapio`, `loja`, `produto:<slug>`) e a alteração revalida só o que mudou.

### Passos (cada um é um PR que deixa tudo funcionando)

**PR 2.0 — prova de conceito (primeiro, porque é a premissa mais arriscada)**

- Projeto Hono mínimo em branch descartável, publicado num projeto de teste na Vercel: runtime
  Node, `maxDuration` e `includeFiles` do `ffmpeg-static` pelo `vercel.json`, uma rota que roda
  `ffmpeg -version` e compacta um vídeo de teste. Medir tamanho da função e tempo.
- Conferir o limite de duração atual do Hobby (com Fluid Compute) e se o projeto aceita
  arquivos fora do Root Directory (necessário para o `packages/core`).
- Se falhar: plano B é deixar só o vídeo como rota do Next e mover o resto para a API.

**PR 2.1 — monorepo sem mudar comportamento**

- Mover o app atual para `apps/web` (`git mv`, histórico preservado). Raiz com `workspaces`.
- CI, Playwright, Prettier, ESLint, Vitest e scripts nos caminhos novos. `supabase/` fica na raiz.
- **Vercel:** `salgae-homologacao` e `salgae-producao` com *Root Directory = `apps/web`* e
  acesso a arquivos fora dele ligado. Stage troca junto com o merge na `develop`; produção só na
  promoção.

**PR 2.2 — `packages/core`**

- Extrair o que é puro: validators, utils, horários da loja, constantes de mídia e os **tipos do
  banco** — no mesmo PR, a geração e a conferência de tipos do CI (`test:types-db`,
  `schema-matches-types.check.ts`, ignore do ESLint) passam a apontar para `packages/core`.
- Testes Vitest vão junto.

**PR 2.3 — esqueleto da API**

- `apps/api` com Hono: `/health` (confere também o Supabase), erro JSON, `request-id`,
  autenticação (Bearer → usuário → admin), tempo limite nas leituras, CORS só para `WEB_ORIGIN`.
- Testes: Vitest nas rotas (`app.request()`), Playwright `request` em `e2e/api/` (401 sem token,
  403 com usuário não admin, 200 com admin).
- CI: Supabase local → build de core/API/web → API sobe e o job **espera o `/health` responder**
  → web sobe com `API_URL` → E2E.
- Projetos novos na Vercel `salgae-api-stage` (develop) e `salgae-api-producao` (main), Root
  Directory `apps/api`. `Dockerfile` da API (Node 22, ffmpeg).

**PR 2.4 — leituras públicas pela API (expandir/contrair)**

- Primeiro a API ganha `GET /v1/cardapio`, `GET /v1/produtos/:slug`, `GET /v1/loja` e vai ao ar
  no stage; depois o web passa a usá-las, com etiquetas de cache e erro lançado (decisão 8).

**PR 2.5 a 2.10 — escritas do painel pela API, um domínio por PR**

Loja → categorias → destaques → produtos → mídia (foto) → vídeo. Em cada um: rota na API com
testes, depois a Server Action vira chamada à API (expandir/contrair), revalidação por etiqueta,
E2E da Fase 1 verde. No vídeo entra a exceção da decisão 1 (CORS + CSP) e `ffmpeg-static`/`sharp`
saem do web.

**PR 2.11 — limpeza e documentação**

- Remover do web o acesso a dados que sobrou; fronteira como erro no lint.
- README com o diagrama novo; notas 06 (arquitetura) e 09 (ambientes) do vault; como subir os
  três pedaços localmente e na VPS.

**Testes que entram ao longo da Fase 2:** sessão expirada sendo renovada; 401 e 403 da API;
API fora do ar sem estragar a versão em cache; conteúdo novo visível logo após alterar.

---

## Fase 3 — Motion (`motion`, importado de `motion/react`)

Regras:

- Um **provider de cliente** (`MotionConfig reducedMotion="user"` + `LazyMotion` com
  `domAnimation`) dentro do layout de servidor — o `app/layout.tsx` continua Server Component.
- Componentes `m.*` para não pesar o pacote do cardápio; só em componentes de cliente.
- `initial={false}` em tudo que vem pronto do servidor: o HTML estático nunca nasce invisível.
- Sem piora de LCP/CLS; CSP não muda (Motion usa `style` em linha, já permitido).

Onde (proposta, o responsável pode cortar):

| Tela | Animação | Cuidado |
| --- | --- | --- |
| Carrossel de destaques | troca de slide com arrasto e mola | manter pausa, `inert`, anúncio para leitor de tela e rolagem nativa que já existem |
| Cardápio | entrada dos cards em cascata na primeira visita | — |
| Barra inferior | indicador da aba ativa deslizando | a barra é remontada depois da hidratação; animar só depois dela para não piscar |
| Busca | resultados entrando/saindo | — |
| Painel | gaveta e confirmação com entrada/saída; avisos; itens trocando de lugar ao reordenar | gaveta e confirmação desmontam na hora hoje: refatorar foco e desmontagem para a saída animar |

Testes: Playwright com `reducedMotion: 'reduce'` (nada se move) e sem (termina no estado certo);
tamanho do JS da página inicial conferido no `next build`.

PRs: 3.1 base + carrossel; 3.2 cardápio, barra e busca; 3.3 painel.

---

## Estimativa grossa

| Fase | PRs | Peso |
| --- | --- | --- |
| 1 — Playwright | 2 | médio |
| 2 — Separação | ~12 (com a prova de conceito) | alto |
| 3 — Motion | 3 | médio |

## O que depende do responsável

1. Aprovar este plano para começar a Fase 1.
2. Na Fase 2: na Vercel, trocar o Root Directory dos dois projetos do site, ligar o acesso a
   arquivos fora dele e criar os dois projetos da API (ou autorizar o Claude a fazer).
3. "Sim" para cada promoção para produção.
4. Cortar ou aprovar a lista de animações da Fase 3 (pode ficar para quando ela chegar).

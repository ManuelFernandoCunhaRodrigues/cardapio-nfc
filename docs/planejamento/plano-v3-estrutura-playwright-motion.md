# Plano v3 — Estrutura de pastas (backend separado do frontend), Playwright e Motion

Status: **versão final — consenso entre Claude e Codex em 2026-10-30.** Revisão 1 do Codex:
"reprovado" (7 problemas, todos aceitos). Revisão 2: "aprovado com mudanças" (3 ajustes,
incorporados): "Consenso: este planejamento está bom e é o correto." Substitui as Fases 2 e 3 de
`separacao-backend-frontend-plano.md` (a Fase 1, Playwright ampliado, já está na `develop`:
#67, #69, #70). Base: nota 25 do vault e o pedido do responsável em 2026-10-28.

## O que o responsável pediu (2026-10-28)

1. **Estrutura de pastas:** backend separado do frontend, com camadas claras (controller,
   service, repository) e remoção dos arquivos que não são usados.
2. **Playwright:** testes de ponta a ponta cobrindo a estrutura nova.
3. **Motion** (`motion`, importado de `motion/react`) nas telas.
4. **Código Limpo:** organizado para outro desenvolvedor entender fácil, não só na tela.
5. **Forma de trabalho:** Claude e Codex planejam juntos e só executam com consenso; sugestões de
   um passam pelo outro; a execução é dividida; **o Codex revisa e testa tudo o que for
   executado** e devolve ao Claude o que estiver errado, até passar.
6. **Stage só no fim:** nada entra na `develop` antes de tudo estar estruturado, executado e
   validado.

## Ponto de partida

- Monorepo (npm workspaces, só `apps/*`), site em `apps/web` (PR #72, aberto).
- `apps/web/src` por funcionalidade (PR #73, aberto, empilhado no #72).
- O "backend" ainda é o Next: as Server Actions misturam validação, autorização, banco, Storage
  e cache no mesmo arquivo (confirmado pelo Codex em `categories/server/actions.ts`,
  `products/server/actions.ts`, `media/server/actions.ts` e `app/admin/(painel)/midia/video/route.ts`);
  a leitura pública (`menu/server/get-public-menu.ts`) engole o erro e devolve um estado de erro
  que vai para o cache.
- Páginas públicas são pré-renderizadas com `revalidate = 60`; a do produto usa
  `generateStaticParams`. O E2E só roda no CI (Docker não sobe nesta máquina).

## Arquitetura alvo

```
navegador ──► apps/web (Next.js — só tela)
   │            leituras públicas: fetch para a API, sem token (build e ISR)
   │            painel: Server Actions finas → API com Authorization: Bearer <token do admin>
   └── vídeo ──► apps/api (Hono, Node; Vercel e Dockerfile para VPS)
                   modules/<domínio>: routes → controller → service → repository
                   ▼
                Supabase (Postgres + RLS, Auth, Storage)

packages/core: schemas zod, tipos do banco, contrato da API (DTOs + cliente tipado),
               regras puras (preço, slug, horários da loja, ordenação, selos, carrossel)
```

### Árvore de pastas alvo

```
apps/
  api/                              @salgae/api — backend
    src/
      index.ts                      entrada da Vercel (definida na prova de conceito, E1)
      server.ts                     entrada Node local/VPS (@hono/node-server)
      app.ts                        monta o Hono: middlewares + módulos em /v1
      config/env.ts                 variáveis validadas com zod
      shared/
        http/                       middlewares: request-id, erro JSON, CORS, tempo limite
        auth/                       autenticação do admin (Bearer → usuário → profiles)
        errors/                     erros de domínio (NotFound, Conflict, Forbidden, Validation)
        supabase/                   fábrica de cliente: público (anon) e por requisição (token)
        observability.ts
      modules/
        menu/                       leitura pública do cardápio
        products/  categories/  highlights/  store/  media/
          <x>.routes.ts             liga caminho → controller (só isso)
          <x>.controller.ts         HTTP: valida entrada com o schema do core, chama o service,
                                    devolve status + JSON. Sem regra, sem banco.
          <x>.service.ts            regra de negócio; define a interface (porta) do repositório
                                    que precisa. Não importa Hono nem Supabase.
          <x>.repository.ts         implementa a porta com o Supabase. Sem regra.
          <x>.module.ts             raiz de composição: cria repository → service → controller
          <x>.service.test.ts       regra testada com repositório falso
          <x>.routes.test.ts        rotas testadas com app.request()
        media/video/                infraestrutura do ffmpeg (argumentos, metadados, processo)
        media/image/                infraestrutura do sharp
    Dockerfile  vercel.json  package.json  tsconfig.json  vitest.config.ts
  web/                              @salgae/web — frontend
    src/
      app/                          rotas do Next (páginas e layouts); sem regra
      features/<domínio>/
        components/                 telas e componentes do domínio
        actions/                    Server Actions finas: FormData → cliente da API → updateTag
        hooks/                      hooks de cliente (quando houver)
      components/ui/                botões, campos, cartões
      components/motion/            provider do Motion e primitivas reaproveitáveis
      lib/
        api/                        cliente da API: público (sem token) e admin (com token)
        auth/                       sessão do login (@supabase/ssr) — único uso do Supabase
        cache/                      nomes das etiquetas e funções de invalidação
        security/ seo/ qr/
      proxy.ts                      sessão só em /admin
packages/
  core/                             @salgae/core — sem dependência de Next, Hono ou Supabase
    src/
      schemas/  contracts/  rules/  database/
e2e/                                @salgae/e2e — Playwright (web + api juntos)
  publico/ painel/ api/ movimento/ sessao/  fixtures.ts  playwright.config.ts
supabase/                           migrations e testes de banco (raiz)
```

Domínios: `menu` (leitura pública), `products`, `categories`, `highlights`, `store`, `media`.

### Decisões técnicas

1. **Dois tipos de chamada à API.**
   - **Pública** (cardápio, produto, loja, sitemap): sem token, porque acontece no build e no
     ISR, quando não há usuário. A API usa a chave anon e a RLS de leitura pública.
   - **Admin** (painel): Server Action → API com `Authorization: Bearer <access token>`. A API
     valida o token no Supabase Auth, confere `profiles.role = admin` e `is_active`, e cria **um
     cliente Supabase por requisição** com esse token. Sem `service_role`; a RLS é a última
     barreira.
2. **Vídeo vai do navegador direto para a API** (`POST /v1/media/video`), porque passar pelo web
   faria duas funções esperarem o ffmpeg. O navegador obtém o token pelo cliente Supabase do
   navegador (`@supabase/ssr`, que já renova a sessão) — **nenhuma Server Action devolve token**.
   CORS só da origem do web; a CSP ganha a origem da API em `connect-src`. Depois do envio, o
   navegador chama uma Server Action leve que só faz `updateTag`.
3. **Login continua no Next** (`@supabase/ssr`, `proxy.ts` só em `/admin`). Helper único no
   web: `getUser()` (valida e renova) → `getSession()` (token já renovado) → chamada à API; sem
   sessão → "entre novamente". Nada de ler cookie à mão.
4. **Cache (conferido na doc do Next 16.4.2 em `node_modules/next/dist/docs/`):**
   - leitura pública: `fetch(url, { next: { revalidate: 60, tags } })`, etiquetas `menu`,
     `store`, `product:<slug>`;
   - leitura do painel (autenticada): `cache: 'no-store'`;
   - depois de uma alteração numa Server Action: `updateTag(tag)` (o admin vê a própria
     alteração na hora);
   - `revalidateTag(tag, 'max')` só onde servir conteúdo antigo enquanto atualiza for aceitável;
     `revalidateTag(tag, { expire: 0 })` para invalidação imediata fora de Server Action;
     nunca a forma de um argumento (obsoleta);
   - **sem `cacheTag`/`'use cache'`**: exigem `cacheComponents`, que não está ligado e não é
     objetivo deste plano.
5. **API fora do ar não estraga o cardápio:** o cliente público **lança** o erro; o build falha
   em vez de publicar tela de erro, e o ISR mantém a última versão boa.
6. **Contrato `/v1`**, JSON, erros no formato atual, `request-id` em toda resposta, schemas e
   cliente tipado no `packages/core`, testes de contrato.
7. **Camadas com dependência para dentro:** o service define a interface do repositório de que
   precisa; o repository implementa; o `*.module.ts` monta as peças (sem framework de injeção).
   Controller não importa repository; service não importa Hono nem Supabase.
8. **Fronteira garantida em três camadas:** dependências (web sem `ffmpeg-static`/`sharp`, API
   sem React/Next, core sem nada disso), `no-restricted-imports` no ESLint (web só usa
   `@supabase/*` em `lib/auth`; API não importa `next`/`react`) e regra de camadas por padrão de
   arquivo.
9. **Variáveis:** web → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (login),
   `API_URL` (servidor, build e execução), `NEXT_PUBLIC_API_URL` (só vídeo),
   `NEXT_PUBLIC_SITE_URL`. API → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WEB_ORIGIN`. Nenhum
   segredo novo.
10. **Workspaces:** raiz com `apps/*`, `packages/*` e `e2e`; nomes `@salgae/web`, `@salgae/api`,
    `@salgae/core`, `@salgae/e2e`; dependência interna declarada em cada app.
11. **CI na ordem certa:** como o build do web passa a buscar dados na API, o job sobe Supabase
    local → build de core e API → API no ar esperando `/health` → build do web com `API_URL` →
    web no ar → Playwright. Isso entra **na etapa do esqueleto da API**, não no fim.
12. **Uma branch de integração e um PR em rascunho para a `develop`** (o CI só roda em PR para
    `develop`/`main`). Push só para rodar o CI; **nada entra na `develop` antes da etapa final**.
    Os PRs #72 e #73 entram na integração e são fechados como incluídos.
13. **Vercel, sem custo:** prova de conceito e prévias em projetos Hobby **de teste**
    (`salgae-api-stage` e `salgae-web-previa`), apontando para o banco do stage; os projetos
    atuais só mudam na etapa final. Produção fica fora deste plano e só com "sim" do
    responsável.

## Padrões de código (Código Limpo)

O código tem de ser fácil de entender para outro desenvolvedor. Toda etapa segue, e toda revisão
confere:

1. **Nomes que dizem a intenção.** Convenção única: identificadores, arquivos e pastas internas
   em **inglês** (como o código já é); textos da tela e URLs públicas em **português** (`/cardapio`,
   `/produto/...`). Funções com verbo (`listMenu`, `deleteCategory`); nada de `data`, `handle`,
   `util`, `helpers` genéricos. Registrado no README.
2. **Funções pequenas com uma responsabilidade.** Controller só traduz HTTP; service só regra;
   repository só banco. Função que faz duas coisas vira duas. Sem efeito colateral escondido.
3. **Um nível de abstração por função** e no máximo ~3 parâmetros (acima disso, objeto nomeado).
4. **Sem duplicação:** mensagens de erro, autorização, invalidação de cache e tradução de erro do
   Supabase em um lugar só.
5. **Erros explícitos:** erros de domínio com tipo próprio, traduzidos em HTTP por um middleware;
   nada engolido; nada de `null` como sinal de erro.
6. **Comentário só para o porquê** (decisão, limite externo). Sem código comentado, sem `TODO`
   órfão.
7. **Arquivos curtos e coesos:** acima de ~250 linhas é candidato a dividir (hoje
   `product-form.tsx`, `products-manager.tsx`, `highlights-manager.tsx`,
   `media/server/actions.ts`, `video/route.ts`).
8. **Dependências para dentro** (decisão 7); `packages/core` não depende de nada do projeto.
9. **Testes legíveis:** um comportamento por teste, nome em frase ("não apaga categoria com
   produtos"), preparar → agir → conferir.
10. **Prettier e ESLint como erro no CI** (já existem).

## Etapas de execução

Cada etapa termina com: revisão e testes do Codex aprovados + CI verde na integração.
**C** = Claude executa, **X** = Codex executa. Revisor de toda etapa: **Codex**, em job novo e só
leitura (inclusive quando ele executou). Testes novos entram **na mesma etapa** do que testam.

| # | Etapa | Executa | Entrega |
| --- | --- | --- | --- |
| E0 | Preparação | C | branch `refactor/estrutura-completa` a partir do #73; PR em rascunho para a `develop`; workspaces `apps/*`, `packages/*`, `e2e`; inventário de arquivos sem uso (`knip` + grafo de imports) e remoção só do que é inequívoco |
| E1 | Prova de conceito na Vercel (**barreira**) | C | API Hono mínima em projeto de teste: entrada reconhecida pela Vercel, runtime Node, `includeFiles` do `ffmpeg-static`, `maxDuration` configurado e conferido contra o limite atual do Hobby, tamanho do pacote, acesso a `packages/core` fora do Root Directory (API e web) usando um `@salgae/core` mínimo criado só para a prova; compactar um vídeo de teste e medir. O código da prova é descartável: ficam só as conclusões (entrada, `vercel.json`, `includeFiles`, `maxDuration`), que a E4 reaproveita; o `core` de verdade nasce na E3. **Se falhar: plano B** — vídeo continua como rota do Next, o resto vai para a API. Resultado registrado aqui antes de seguir |
| E2 | Playwright na raiz | C | `e2e/` como `@salgae/e2e`; dependências do Playwright/axe (4.14, #71) movidas; autenticação, relatórios, `.gitignore` e artefatos do CI nos caminhos novos; a própria E2 sobe o `@axe-core/playwright` de 4.13.0 para 4.14.0 (o #71 é fechado como incluído); 56 testes verdes |
| E3 | `packages/core` | X | schemas, contratos, regras puras, utils e tipos do banco com seus testes; geração e conferência de tipos do CI apontando para o core; piso de cobertura próprio |
| E4 | API — esqueleto | X (código) + C (npm, CI) | `apps/api` com `shared/` (middlewares, erros, auth, fábrica Supabase), `/health`, Dockerfile, piso de cobertura próprio; **CI na ordem da decisão 11** — o CI hoje tem dois `npm run build`: o job de verificação deixa de construir o web (fica com lint, typecheck, Vitest e build de core e API) e o build do web passa a acontecer só no job do E2E, com a API no ar; E2E de API: 401 sem token, 403 não admin, 200 admin, `request-id` |
| E5 | Leituras públicas | X | módulo `menu` (+ leitura de `store` e produto por slug); web lê pelo cliente público com etiquetas e erro lançado; E2E: cardápio igual, API fora do ar mantém a versão em cache |
| E6a | Escritas: loja, categorias, destaques | C | módulos com as quatro camadas + testes; Server Actions finas com `updateTag`; E2E do painel desses domínios verdes |
| E6b | Escritas: produtos, foto, vídeo | X | idem; vídeo pela decisão 2; `ffmpeg-static`/`sharp` saem do web; E2E de mídia verdes |
| E7a | Motion — base, carrossel, cardápio, barra, busca | X | provider + `m.*` + testes de movimento (com e sem `reducedMotion`) e tamanho do JS conferido no `next build` |
| E7b | Motion — painel | C | gaveta e confirmação com saída animada, avisos, reordenação + testes |
| E8 | Fechamento | C | `knip` de novo (o grafo mudou); fronteiras como erro no ESLint; README (diagrama, convenção de nomes, como subir os três pedaços local e na VPS); notas 06, 09 e 25 do vault; memória |
| E9 | Prévia completa e stage | C + X | prévia da integração nos projetos de teste → conferência completa no navegador (cardápio, painel, foto, vídeo) → CI verde → **revisão final do Codex** → aprovado → ajustar `salgae-homologacao` (Root Directory `apps/web`, `API_URL`) e ligar `salgae-api-stage` à `develop` → merge na `develop` → conferência de novo no stage |

### Motion — onde entra

| Tela | Animação | Cuidado |
| --- | --- | --- |
| Carrossel de destaques | troca de slide com arrasto e mola | manter pausa, `inert`, anúncio para leitor de tela e rolagem nativa |
| Cardápio | entrada dos cards em cascata na primeira visita | sem atrasar o LCP |
| Barra inferior | indicador da aba ativa deslizando (`layoutId`) | animar só depois da hidratação para não piscar |
| Busca | resultados entrando/saindo (`AnimatePresence`) | — |
| Painel | gaveta e confirmação com entrada/saída; avisos; reordenação | foco volta ao botão de origem; nada fica preso no DOM |

Regras: `MotionConfig reducedMotion="user"` + `LazyMotion`/`domAnimation` num provider de
cliente; `app/layout.tsx` continua Server Component; `initial={false}` no que vem do servidor
(nada nasce invisível); sem piora de LCP/CLS; CSP não muda.

### Limpeza — critério

- **Remove:** código e scripts sem import nem comando nem documento que os cite (ex.:
  `apps/web/scripts/recortar-logo.mjs`, confirmado pelo Codex), `.gitkeep` que deixar de ser
  necessário, configuração que ficar sem uso depois da migração.
- **Tira do repositório, guardando cópia local em `materiais/`** (ignorada pelo git):
  `docs/design/Design MVP de delivery.zip` — o protótipo atual está no Claude Design.
- **Fica:** documentação histórica e scripts citados em documentos (`verificar-urls.mjs`,
  `lighthouse-homologacao.mjs`); nada do vault é apagado.

## Protocolo de execução e revisão

1. **Ideia dos testes primeiro** (testes cruzados): quem executa propõe os testes da etapa; o
   outro valida a ideia antes de rodar.
2. **Executor** trabalha numa branch curta a partir da integração (`stage/eN-...`) e roda lint,
   typecheck, Vitest e build. O Codex não tem rede para o npm: instalações e builds que baixam
   algo ficam com o Claude.
3. **Revisão do Codex** (sempre, job novo, só leitura): diff contra o plano, a arquitetura e a
   lista de Código Limpo; roda lint, typecheck, Vitest e build; responde "aprovado" ou lista de
   problemas com arquivo e linha.
4. **Correção:** os problemas voltam para o **Claude**, que corrige e devolve ao Codex; repete
   até aprovar.
5. **CI:** a etapa aprovada entra na integração; o CI do PR em rascunho (com E2E e Supabase
   local) tem de ficar verde. Falha volta ao passo 4.
6. **Registro:** cada etapa atualiza a memória `estado-do-projeto` (handoff); sugestões aceitas
   entram neste plano.

Modelos do Codex (família 5.6, nunca `gpt-6-astra`): planejamento e revisões →
`gpt-5.6-sol`/high; API, vídeo e cache → `gpt-5.6-sol`/medium; core, leituras e Motion →
`gpt-5.6-terra`/medium; levantamentos simples → `gpt-5.6-luna`/low.

## Pronto quando

- `apps/web` sem acesso a tabelas do Supabase (só login) e sem `ffmpeg-static`/`sharp`;
  `apps/api` com as quatro camadas em todos os módulos; `packages/core` sem dependência de
  Next/Hono/Supabase.
- `knip` limpo (exceções justificadas).
- E2E antigos verdes + novos de API, falha da API, sessão e Motion; pisos de cobertura de core,
  API e web mantidos.
- Stage funcionando com a API própria, conferido no navegador.

## O que depende do responsável

- "Sim" para produção (fora deste plano).
- Se a prova de conceito mostrar que precisa de plano pago, tudo para e vira pergunta por e-mail.

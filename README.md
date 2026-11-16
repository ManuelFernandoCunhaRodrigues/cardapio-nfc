# Salgaê Lanchonete — cardápio digital

Cardápio digital de **consulta no local** para uma lanchonete: o cliente aponta a câmera para um QR Code na mesa, vê os produtos com foto, vídeo curto, preço e disponibilidade, e faz o pedido com o atendente. A equipe mantém tudo por um painel administrativo feito para o celular.

**Demonstração:** <https://salgae-producao.vercel.app> · **Stage (com conteúdo de exemplo):** <https://salgae-homologacao.vercel.app>

> A hospedagem é gratuita (Vercel Hobby e Supabase free). O Supabase pausa o banco depois de cerca de 7 dias sem uso: se o cardápio não carregar, o banco precisa ser reativado no painel do Supabase. O roteiro antes de mostrar o sistema está em [Publicação e demonstração](docs/publicacao-producao.md).

![Telas do cardápio no celular: início, cardápio, produto, informações e entrada do painel](docs/readme/telas.jpg)

> Este repositório não inclui delivery, carrinho, checkout nem pagamento. O cardápio é só de consulta: _"Consulta apenas. Faça seu pedido com o atendente."_

## O que o sistema faz

**Para o cliente**

- Início com carrossel de destaques, atalhos de categoria e os mais pedidos.
- Cardápio completo por categoria, com selos (`MAIS PEDIDO`, `NOVO`, `QUENTINHO`) e itens indisponíveis sinalizados.
- Página do produto com foto, vídeo curto sem som e outros itens da mesma categoria.
- Busca por nome, ingrediente ou categoria, sem depender de acento ou maiúscula.
- Situação da loja (aberta ou fechada) calculada a partir dos horários, com horários e contatos.

**Para a equipe**

- Produtos, categorias e destaques: criar, editar, ordenar, mostrar e esconder.
- Situação única por produto: **No cardápio**, **Em falta hoje** ou **Escondido**.
- Envio de foto e de vídeo com otimização automática, inclusive a foto de cada categoria.
- Dados e horários da loja, com abrir ou fechar manualmente em dois toques.
- Registro de auditoria das alterações feitas no painel.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Site (`apps/web`) | Next.js 16 (App Router, Server Components e Server Actions), React 19, TypeScript estrito |
| API (`apps/api`) | Hono sobre Node.js 22, rodando dentro do site; Docker pronto para servidor separado |
| Regras comuns (`packages/core`) | Zod, contratos da API e regras puras, sem framework |
| Estilo e movimento | Tailwind CSS 4 e Motion (`motion/react-m` com `LazyMotion`) |
| Dados | Supabase: PostgreSQL com Row Level Security, Auth e Storage |
| Mídia | `sharp` (WebP) e `ffmpeg` (H.264) |
| Qualidade | Vitest, Playwright com axe, ESLint, Prettier, knip, GitHub Actions |
| Hospedagem | Vercel, um projeto por ambiente, com site e API juntos |

## Arquitetura

O site só desenha a tela. Tudo o que lê ou grava dados passa pela API, a única peça que fala com o banco e com o Storage; o site usa o Supabase apenas para o login.

Em cada ambiente, os dois são publicados juntos em um único projeto: o site chama a API dentro do mesmo processo, sem passar pela rede, e ela também responde em `/api`. Só `apps/web/src/lib/api/` importa a API, e o ESLint barra esse import no restante do site. A decisão e as alternativas estão em `docs/planejamento/dois-projetos-por-ambiente.md`.

O vídeo segue a mesma regra: quem confere, compacta e publica é a API (`apps/api/src/modules/media/video/`). A rota do painel `apps/web/src/app/admin/(painel)/midia/video/route.ts` só repassa o pedido para ela, porque a compactação precisa de uma função de até 180 s com o binário do `ffmpeg`. Por isso essa rota é o único outro ponto do site que referencia a API, e pelo endereço `/api` o processamento de vídeo responde 501.

```mermaid
flowchart LR
  Cliente["Cliente<br/>QR Code"] --> Publico
  Equipe[Equipe] --> Painel

  subgraph Web["apps/web — Next.js"]
    Publico["Páginas públicas<br/>estáticas, revalidadas a cada 60 s"]
    Painel["Painel /admin<br/>dinâmico, exige sessão"]
    Actions["Server Actions finas<br/>formulário → API → updateTag"]
    Painel --> Actions
  end

  subgraph Api["apps/api — Hono, no mesmo processo do site"]
    Rotas["/v1: routes → controller<br/>→ service → repository"]
  end

  subgraph Supa["Supabase"]
    Banco[(PostgreSQL + RLS)]
    Auth[Auth]
    Storage[Storage]
  end

  Publico -- leitura pública, sem token --> Rotas
  Actions -- Bearer do admin --> Rotas
  Rotas -- chave pública + token do admin --> Banco
  Rotas --> Storage
  Painel -- login --> Auth
  Core["packages/core<br/>schemas, contratos, regras"] -.-> Web
  Core -.-> Api
```

Organização das pastas (monorepo com npm workspaces):

```
apps/
  web/          site: cardápio e painel, só tela (@salgae/web)
  api/          API: leitura pública e escrita do painel (@salgae/api)
packages/
  core/         schemas Zod, contratos da API, tipos do banco e regras puras (@salgae/core)
e2e/            testes de ponta a ponta com Playwright, contra o site com a API dentro (@salgae/e2e)
supabase/       migrations, seed e testes SQL
docs/           documentação técnica; Salgae_Lanchonete_Obsidian/ — vault do projeto
```

### API em camadas

Cada domínio (`menu`, `products`, `categories`, `highlights`, `store`, `media`, `session`) é uma pasta em `apps/api/src/modules/` com quatro camadas, e a dependência sempre aponta para dentro:

| Arquivo | Faz | Não faz |
| --- | --- | --- |
| `x.routes.ts` | liga o caminho ao controller | regra, banco |
| `x.controller.ts` | traduz HTTP: valida a entrada com o schema do core, chama o service, devolve status e JSON | regra, banco |
| `x.service.ts` | regra de negócio; define a interface do repositório de que precisa | importar Hono ou Supabase |
| `x.repository.ts` | implementa essa interface com o Supabase | regra |
| `x.module.ts` | monta repository → service → controller, sem framework de injeção | — |

O que é comum fica em `apps/api/src/shared/`: erros de domínio e sua tradução para HTTP, autenticação do admin, `request-id`, CORS, tempo limite de 15 s e a fábrica do cliente Supabase. O ESLint barra os imports que quebrariam as camadas (controller importando repository, service importando Hono ou Supabase, API importando React ou Next).

### Site por funcionalidade

```
apps/web/src/
  app/              rotas do Next.js (páginas e layouts), sem regra
  features/<x>/     components/ (tela), server/ (Server Actions finas e leituras),
                    client/ (navegador sem tela), hooks/, rules/ (regras só de tela)
  components/       ui/ (botões, campos) e motion/ (provider e primitivas do Motion)
  hooks/            hooks comuns (hidratação, media query)
  lib/              api/ (clientes público e do admin), supabase/ e auth/ (login),
                    cache/, security/ (CSP), seo/, qr/
  proxy.ts          renovação da sessão, só em /admin
```

O ESLint do site também guarda as fronteiras: `@supabase/*` só em `lib/supabase` e `lib/auth`, `sharp` e `ffmpeg-static` só nos testes, a API só em `lib/api/embedded-api.ts` e na rota do vídeo, e o Motion só por `motion/react-m`. O `packages/core` não pode importar framework, banco nem os apps.

### Convenção de nomes

- Código em **inglês**: identificadores, arquivos e pastas internas (`listMenu`, `deleteCategory`, `products.service.ts`). Funções começam com verbo; nada de `data`, `handle`, `utils` ou `helpers` genéricos.
- Tela e URLs públicas em **português**: textos, mensagens e rotas (`/cardapio`, `/produto/...`).
- Testes descrevem o comportamento numa frase em português ("não apaga categoria com produtos"), um comportamento por teste.

## Rotas

| Rota | O que é |
| --- | --- |
| `/` | Início: destaques, categorias e mais pedidos. |
| `/cardapio` | Lista completa por categoria. |
| `/produto/[slug]` | Detalhe do item pelo nome (ex.: `/produto/coxinha-de-frango`), com vídeo opcional. Endereços antigos por id redirecionam para o novo. |
| `/busca` | Busca por nome, ingrediente ou categoria. |
| `/info` | Situação da loja, horários e contatos. |
| `/admin` | Resumo do painel e itens que precisam de atenção. |
| `/admin/produtos`, `/admin/categorias`, `/admin/destaques` | Cadastro, situação e ordenação. |
| `/admin/loja` | Dados e horários da loja. |

## Decisões técnicas

**A autorização final é do banco.** Toda ação do painel confere o administrador na aplicação (`requireAdmin`) e de novo no PostgreSQL, por políticas de RLS que consultam `private.is_admin()` — uma função fora do esquema exposto pela API. A aplicação usa só a chave pública; a `service_role` não existe no projeto. Se uma verificação da aplicação for esquecida, o banco ainda recusa a escrita.

**Páginas públicas estáticas, painel dinâmico.** O cardápio é gerado estaticamente e revalidado a cada 60 segundos. As leituras públicas vão à API com etiquetas de cache (`menu`, `store`, `product:<slug>`), e cada alteração no painel chama `updateTag` na Server Action: quem alterou vê o resultado na hora. O visitante nunca espera o banco. O "aberta ou fechada" é recalculado no navegador, porque uma página em cache não sabe que horas são.

**Banco fora do ar não estraga o cardápio.** Se a leitura pública falhar (erro do banco, ou 504 da API depois de 15 s), o site **lança** o erro em vez de publicar uma tela de erro: no build a publicação falha, e na revalidação o Next mantém a última versão boa. No fim do CI, o Supabase local é derrubado de propósito (`e2e/scripts/banco-fora-do-ar.sh`): o script espera passar a revalidação de 60 s e confere que Início, Cardápio e produto continuam no ar.

**Sem segredo novo.** A API usa a mesma chave pública do site e, nas escritas, um cliente Supabase por requisição com o token do administrador. A RLS continua sendo a última barreira.

**Fotos em duas variantes.** O navegador reduz a foto antes de enviar; o servidor valida pelo conteúdo, remove metadados e gera WebP `card` (até 640 px, meta de 80 KB) e `detail` (até 1600 px, meta de 300 KB). O banco guarda só a base do caminho e a interface escolhe a variante.

**Vídeo sempre leve.** O arquivo bruto vai direto do navegador para um bucket privado por URL assinada. Depois, a API confere o tipo real pela assinatura do arquivo, compacta com `ffmpeg` (H.264, até 720p, sem áudio, `faststart`) e publica o resultado, tipicamente de dezenas de megabytes para 1 a 3 MB. O bruto e os temporários são apagados sempre, com sucesso ou com erro.

**Troca de mídia sem deixar item quebrado.** O arquivo novo é enviado, o registro passa a apontar para ele e só então o antigo é apagado — e apenas se nenhum outro registro o usar. A troca só grava se o item ainda aponta para o arquivo lido no começo; quem perde uma corrida apaga o que enviou. Se a gravação falhar, o arquivo novo é removido e o item continua como estava. Uma regra única (`apps/api/src/modules/media/remove-media-if-unused.ts`) vale para foto, vídeo e exclusões.

**Reordenação atômica.** Trocar dois itens de posição é uma única instrução no banco, por uma função SQL. Ou as duas posições mudam, ou nenhuma.

**Preço em centavos.** O preço é um inteiro (`price_cents`), sem ponto flutuante; a conversão de e para "R$ 8,90" fica em duas funções testadas no `packages/core`.

**Movimento sem custo de acessibilidade.** O Motion entra por um provider de cliente com `MotionConfig reducedMotion="user"` e `LazyMotion strict`, carregando os recursos sob demanda. Só `opacity` e `transform` são animados, nada nasce invisível no HTML do servidor e, no painel, a gaveta ou a confirmação que está saindo fica `inert` e `aria-hidden` até sumir.

## Qualidade

- Testes unitários e de integração com Vitest (`npm test`) nos três pacotes: na API, services com repositório falso e rotas com `app.request()`; no site, Server Actions, rotas e regras de tela; no core, as regras puras. Cada pacote tem um piso de cobertura próprio, conferido no CI (`npm run test:coverage`).
- Testes em SQL (`supabase/tests/`) de RLS, Storage, reordenação, auditoria, endereço do produto e troca de categoria. Rodam dentro de uma transação desfeita no fim e conferem o que visitante, usuário comum e administrador conseguem ler e escrever.
- Testes de ponta a ponta com Playwright (`e2e/`), contra o build de produção do site, com a API dentro, ligado ao Supabase local: cardápio no celular e no computador, painel (produtos, situações, categorias, destaques e loja), foto e vídeo, cache, cliques repetidos, sessão expirada, acessibilidade com axe e movimento com e sem `prefers-reduced-motion`.
- CI no GitHub Actions a cada PR para `develop` ou `main`, em dois jobs. O primeiro confere formatação, lint, typecheck, `knip` (arquivos, exports e dependências sem uso), `npm audit` das dependências de produção, testes com cobertura e o build da API. O segundo sobe o Supabase local, aplica todas as migrations num banco vazio, confere os tipos versionados, roda os testes SQL, faz o build do site lendo esse banco, roda os testes de ponta a ponta, sobe a imagem Docker da API e, por último, derruba o banco para conferir que o cardápio continua no ar.
- Acessibilidade tratada como requisito: navegação por teclado, foco preso e devolvido nas camadas do painel, rótulos para leitor de tela e respeito a movimento reduzido.
- Cabeçalhos de segurança (`Content-Security-Policy`, `HSTS`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) e páginas de stage fora dos buscadores. A CSP (`apps/web/src/lib/security/csp.ts`) só aceita scripts do próprio site, e os testes de ponta a ponta falham se alguma página tiver algo bloqueado por ela.
- Erros registrados como uma linha JSON, com evento e código, no site e na API (cada resposta da API leva um `request-id`).
- Dependabot abre, toda segunda-feira, PRs de atualização para a `develop`; eles passam pelo mesmo CI.

## Executar localmente

Requisitos: Node.js 22 ou superior e um projeto Supabase (o de stage serve para desenvolver; com Docker, `npx supabase start` sobe um local). Os testes de banco e de ponta a ponta usam o Supabase local.

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
```

Preencha em `apps/web/.env.local` a URL e a chave anônima/publicável do projeto Supabase (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`) e `NEXT_PUBLIC_SITE_URL`. Nunca use uma `service_role`. Depois:

```bash
npm run dev
```

A API já vem junto, em `/api`. O build de produção também lê o banco, porque as páginas públicas são geradas com esses dados.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Site e API em desenvolvimento. |
| `npm run dev:api` / `npm run build -w @salgae/api` / `npm run start -w @salgae/api` | API sozinha, para servidor separado (usa `apps/api/.env`, com `WEB_ORIGIN` para o CORS). |
| `npm run build` / `npm run start` | Build de produção do site e execução dele. |
| `npm run lint` | ESLint em todos os pacotes. |
| `npm run typecheck` | TypeScript estrito em todos os pacotes. |
| `npm run knip` | Arquivos, exports e dependências sem uso. |
| `npm test` / `npm run test:coverage` | Vitest em todos os pacotes, com ou sem cobertura. |
| `npm run test:db` | Testes SQL de RLS, Storage e reordenação contra o Supabase local. |
| `npm run test:e2e` | Testes de ponta a ponta com Playwright, contra o build de produção do site e o Supabase local. |
| `npm run test:types-db` | Confere os tipos versionados contra os gerados do banco local (usado no CI). |
| `npm run format` / `npm run format:check` | Formata ou confere a formatação com Prettier. |

### Testes de ponta a ponta no computador

Os testes do painel criam, alteram e apagam dados. Por isso, fora do CI, o Playwright se recusa a rodar quando `NEXT_PUBLIC_SUPABASE_URL` não aponta para `127.0.0.1` ou `localhost`. Ele só segue com outro banco se `E2E_ALLOW_REMOTE_SUPABASE=1` estiver definido. Com o Docker no ar:

```bash
npx supabase start          # banco local com todas as migrations e o seed
npx supabase status -o env  # mostra API_URL e ANON_KEY do banco local
```

Exporte as variáveis no terminal. Os valores do terminal valem mais que os do `apps/web/.env.local`, tanto no build quanto no Playwright:

```bash
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY do comando acima>
export NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
export E2E_ADMIN_EMAIL=admin@salgae.test
export E2E_ADMIN_PASSWORD=<uma senha qualquer, só para o banco local>
```

`E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD` são o login do administrador de teste. Ele só existe no banco local e é criado pelo `npm run test:db`. Depois:

```bash
npm run test:db                     # cria o administrador de teste e roda os testes SQL
npx playwright install chromium     # uma vez só
npm run build
npm run test:e2e                    # sobe o site na porta 3000 e roda o Playwright
```

### Servidor próprio (VPS)

O site roda com Node e já inclui a API. Ele precisa das mesmas variáveis no build e na execução (as `NEXT_PUBLIC_` entram no JavaScript no build):

```bash
npm ci
cp apps/web/.env.example apps/web/.env.local   # preencher: Supabase, NEXT_PUBLIC_SITE_URL e NEXT_PUBLIC_SITE_ENV
npm run build
npm run start -- --port 3000
```

Para o site voltar sozinho depois de uma queda ou reinício, rode o `npm run start` por um serviço supervisionado (um serviço do `systemd` com `Restart=always` e `WorkingDirectory` na raiz do repositório, ou o `pm2`). Na frente dele, um proxy reverso (Nginx ou Caddy) com HTTPS.

Para quem precisar da API em um servidor separado, ela tem um `Dockerfile`, com contexto na raiz do repositório porque embute o `packages/core`. O site continua usando a própria cópia da API:

```bash
docker build -f apps/api/Dockerfile -t salgae-api .
docker run -d --restart unless-stopped -p 127.0.0.1:4000:4000 \
  -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -e WEB_ORIGIN=https://cardapio.exemplo.com \
  salgae-api
```

## Banco de dados

As migrations ficam em `supabase/migrations/`. O workflow **Migrations** do GitHub Actions as aplica com a CLI do Supabase: no stage, a cada merge na `develop` que mude migrations; em produção, por um "Run workflow" manual antes da promoção, e o PR para a `main` é reprovado enquanto a produção não tiver a migration. Ele depende de três segredos do repositório: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD_STAGE` e `SUPABASE_DB_PASSWORD_PRODUCAO`. **Enquanto eles não forem cadastrados, o workflow falha de propósito e nenhuma migration é aplicada pelo CI.** Até lá, a aplicação é manual, pelos comandos abaixo. O passo a passo está em [Migrations pelo CI](docs/migrations-pelo-ci.md).

O workflow **Ambientes no ar** chama o `/api/health` do stage e da produção a cada 2 dias (a rota consulta o banco, o que evita a pausa do Supabase gratuito e avisa quando algum ambiente cai) e, aos domingos, guarda uma cópia do banco da produção como artefato por 30 dias. A cópia precisa de `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD_PRODUCAO`. O GitHub só roda workflows agendados a partir da branch padrão (`main`), então o ping e a cópia passam a rodar sozinhos depois que este workflow chegar à `main`.

O mesmo comando funciona à mão, se for preciso:

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

| Migration | O que faz |
| --- | --- |
| `20261008222757_initial_schema` | Categorias, produtos, destaques, perfis e auditoria, com RLS. |
| `20261008225427_harden_rls` | Move `is_admin()` para um esquema privado e deixa uma política por papel e ação. |
| `20261008232020_store_settings` | Dados únicos da loja: horários, contatos e aviso. |
| `20261009103822_product_badge` | Selos do produto. |
| `20261009121148_media_storage` | Buckets públicos de imagens e vídeos e suas políticas. |
| `20261011003026_video_compression_storage` | Bucket privado para o vídeo bruto e limite de 4 MB no publicado. |
| `20261013151000_atomic_sort_order_swap` | Funções de troca de posição em uma única instrução. |
| `20261014120000_audit_and_sort_order_triggers` | Gatilhos que gravam a auditoria na mesma transação e põem o item novo no fim da lista. |
| `20261014150000_product_slug` | Endereço do produto pelo nome (`slug` único), gerado na criação. |
| `20261115120000_product_sort_order_on_category_change` | Produto que troca de categoria vai para o fim da categoria nova; corrige posições repetidas. |

`supabase/seed.sql` traz dados de exemplo para ambiente local ou stage. Não execute o seed em produção.

Os tipos do banco ficam em `packages/core/src/database/database.types.ts`. O arquivo é gerado pelo Supabase a partir do esquema; depois de uma migration nova, gere de novo (`npx supabase gen types typescript --project-id <ref-do-projeto> > packages/core/src/database/database.types.ts`) em vez de editar à mão. A API e o site recebem esse tipo, então um nome de tabela, coluna ou função errado vira erro no `npm run typecheck`.

### Primeiro administrador

1. Crie o usuário em **Authentication > Users** no Supabase.
2. No SQL Editor, crie o perfil inativo:

```sql
insert into public.profiles (id, name, role, is_active)
values ('UUID_DO_USUARIO', 'Nome do responsável', 'admin', false)
on conflict (id) do nothing;
```

3. Depois da conferência, ative-o:

```sql
update public.profiles
set role = 'admin', is_active = true
where id = 'UUID_DO_USUARIO';
```

Não há trigger que promova alguém automaticamente.

## Ambientes

| Ambiente | Branch | Banco | Endereço |
| --- | --- | --- | --- |
| Desenvolvimento | qualquer | stage | `npm run dev` |
| Stage | `develop` | SALGAE-STAGING | <https://salgae-homologacao.vercel.app> |
| Produção | `main` | SALGAE-PRODUCTION | <https://salgae-producao.vercel.app> |

Toda mudança entra por PR na `develop`, é conferida no stage e só então é promovida para a `main`.

## Vídeo: detalhes

| | Entrada (o que o painel aceita) | Saída (o que o cliente baixa) |
| --- | --- | --- |
| Formato | MP4, MOV (iPhone) ou WebM; H.264, HEVC, VP9… | MP4 H.264 (High, nível 3.1), 8 bits |
| Tamanho | até 50 MB | até ~3 MB para 15 s (teto de 4 MB) |
| Duração | até 15 s (tolerância de 0,5 s) | a mesma |
| Resolução | até 4K | cabe em 1280×720 ou 720×1280, sem ampliar |
| Quadros | qualquer | no máximo 30 por segundo |
| Áudio | qualquer | removido |
| Extras | HDR, rotação, GPS do celular | SDR, rotação aplicada, metadados removidos, `faststart` |

O `ffmpeg` vem do pacote `ffmpeg-static` e roda como programa separado; o binário é distribuído sob GPL. Em servidor próprio também é possível usar o do sistema: `sudo apt install ffmpeg` e `FFMPEG_PATH=/usr/bin/ffmpeg`. Na Vercel, `next.config.ts` inclui o binário só no pacote da rota `/admin/midia/video`, que declara `maxDuration = 180` e chama a API dentro da mesma função. A foto continua obrigatória: é a capa do vídeo.

## Mais documentação

- [Guia da equipe](docs/guia-da-equipe.md) — como usar o painel no dia a dia.
- [Publicação e demonstração](docs/publicacao-producao.md) — estado dos ambientes, workflows e segredos, e o roteiro antes e depois de uma demonstração.
- [Migrations pelo CI](docs/migrations-pelo-ci.md) — como o GitHub Actions aplica as migrations no stage e na produção.
- [Resultados de testes](docs/testes/) — planos e medições de cada entrega.
- `Salgae_Lanchonete_Obsidian/` — visão do produto, decisões, modelo de dados e identidade visual, em notas do Obsidian.

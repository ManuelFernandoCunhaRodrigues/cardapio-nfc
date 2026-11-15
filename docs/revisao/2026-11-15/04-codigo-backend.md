# Revisão de código do backend: Salgaê

Branch `fix/achados-testes-navegador`. Escopo: `apps/api` (Hono), `packages/core` e, porque o pedido cita ffmpeg, o pipeline de vídeo que hoje mora em `apps/web` (`app/admin/(painel)/midia/video/route.ts` e `features/media/server/*`). Banco, RLS, Storage e auth ficaram com outro revisor; aqui eles só aparecem quando a lógica da API depende deles.

Testes rodados: `npm test -w @salgae/api` passou com 20 arquivos e 107 testes; `npm test -w @salgae/core` passou com 13 arquivos e 40 testes.

Só entra aqui o que conferi no código. Caminhos relativos à raiz do repositório.

---

## Achados (ordenados por severidade)

Severidade: P0 = quebra ou é explorável · P1 = grave · P2 = médio · P3 = melhoria. Esforço: P = pequeno, M = médio, G = grande.

Não encontrei nenhum P0.

### API-01 | P1 | `apps/web/src/app/admin/(painel)/midia/video/route.ts:136-321`, `apps/web/src/features/media/server/actions.ts:30-112`
**Problema:** o pipeline de vídeo fica fora da API e não segue as camadas. O `POST` tem cerca de 185 linhas e faz tudo no route handler: checagem de origem, auth, validação, consultas diretas ao Supabase (`products`, `storage.from(...)` nas linhas 165, 177, 209, 227, 247, 263, 273, 313 e 316), ffmpeg, commit e limpeza. As server actions `createProductVideoUpload` e `removeProductVideo` também falam direto com o Supabase. A autorização usa `getAdminAuthorization` do web, e não o `requireAdmin` da API, então há duas implementações de "é admin?".
**Cenário concreto:** um dev novo procura "onde se apaga mídia de produto" e encontra três lugares: `ProductsService.cleanupMedia` na API, `removeProductVideo` no web e `cleanupPrevious` no route. Uma mudança de regra, por exemplo "vídeo exige capa", precisa ser replicada em `actions.ts:44-49`, `route.ts:165-174` e na constraint do banco.
**Correção sugerida:** criar `apps/api/src/modules/media/video/` com `video.routes` (POST `/v1/admin/products/:id/video`, DELETE, POST `/upload-url`), `video.controller`, `VideoService` (orquestra o commit/rollback que hoje está em `commitStagedMedia`) e `VideoRepository` (Storage e `products.video_path`). O ffmpeg (`compress.ts`, `process.ts`, `arguments.ts`) vira um adaptador injetado, como o `compressImageToWebp`. A rota Next só repassa para a API embutida, com `maxDuration` próprio. Se o vídeo continuar no Next por causa do `maxDuration`, extrair pelo menos service e repositório e deixar o route com cerca de 20 linhas.
**Esforço:** G

### API-02 | P2 | `apps/api/src/shared/http/request-timeout.ts:6-8` (Hono `timeout` = `Promise.race`)
**Problema:** o timeout de 15 s responde 504, mas não cancela o handler. `hono/timeout` faz `Promise.race([next(), timeoutPromise])`, e o handler continua rodando e gravando depois da resposta.
**Cenário concreto:** o upload de foto leva mais de 15 s (Storage lento, cold start, ou as 6 codificações do API-05). O admin vê "A solicitação demorou mais que o esperado", mas o `ImageService.upload` termina: `image_path` muda e a foto antiga é apagada. O admin reenvia, sobe outra foto e o cache do cardápio não é invalidado na primeira vez, porque a server action tratou o resultado como erro.
**Correção sugerida:** passar um `AbortSignal` (`context.req.raw.signal` mais o timeout) até o service e conferir `signal.throwIfAborted()` antes de cada passo que grava (`uploadVariants`, `setImagePath`, `removeIfUnused`). Nos repositórios, usar `.abortSignal(signal)` do supabase-js. Alternativa mínima: um timeout maior só para as rotas de upload e o front tratar 504 como "estado incerto, recarregue".
**Esforço:** M

### API-03 | P2 | `apps/api/src/modules/media/image/image.service.ts:60-85`
**Problema:** há corrida em upload e remoção de foto. O fluxo é ler o registro, subir os arquivos, gravar `image_path = novo` e apagar o caminho lido no começo. Não há controle de concorrência no `update`.
**Cenário concreto:** duplo clique ou duas abas. As requisições A e B leem `image_path = X`. A grava `A` e apaga `X`. B grava `B` e tenta apagar `X` de novo. Os arquivos `A-detail.webp` e `A-card.webp` ficam órfãos para sempre, porque não há faxina de imagens, só de vídeo. O mesmo acontece com upload concorrente a `remove`: a remoção zera o vínculo da foto recém-enviada e os arquivos dela ficam órfãos.
**Correção sugerida:** fazer um update condicional no repositório, `update({ image_path: novo }).eq('id', id).is/eq('image_path', atual)`, com `.is('image_path', null)` quando `atual` é nulo. Se nenhuma linha mudar, remover o que foi enviado e lançar `ConflictError('A foto foi alterada em outra aba. Recarregue.')`. Usar o mesmo padrão no `remove`.
**Esforço:** P

### API-04 | P2 | `apps/api/src/modules/media/image/image-compressor.ts:12-24` (e `supabase/migrations/20261009121148_media_storage.sql:4-5`)
**Problema:** `encodeVariant` devolve `lastOutput!` mesmo acima do alvo. O alvo de 300 KB (detalhe) e 80 KB (card) é ignorado em silêncio, e nada no código conhece o limite real do bucket (`file_size_limit = 1048576`, ou seja 1 MB, em `product-images` e `highlight-images`). Há ainda um `!` (non-null assertion) que esconde o caso "lista de qualidades vazia".
**Cenário concreto:** uma foto com muita textura (granulado, folhagem, ruído de ISO alto) em 1600 px com q70 passa de 1 MB. O `upload` do Storage é recusado e o erro sobe cru até o `errorHandler`: 500 genérico "Não foi possível concluir a solicitação", reportado como falha de servidor, quando na verdade é uma imagem válida que o código não conseguiu encaixar.
**Correção sugerida:** depois das 3 qualidades, reduzir as dimensões (por exemplo `maxSide * 0.8`, até 2 tentativas) ou lançar `ImageTooLargeError`, mapeado para `ValidationError` no service. Exportar `IMAGE_BUCKET_MAX_BYTES = 1_048_576` com um comentário apontando a migration, e cobrir com um teste usando ruído aleatório (`sharp({ create, noise })`).
**Esforço:** P

### API-05 | P2 | `apps/api/src/modules/media/image/image-compressor.ts:26-45`
**Problema:** o custo de CPU e memória não tem limite próprio:
1. Não há limite de pixels, porque o padrão do sharp aceita cerca de 268 MP. Um PNG de 4 MB com 16000×16000 de cor sólida passa pelo `bodyLimit`.
2. Cada tentativa de `encodeVariant` decodifica a entrada de novo. São até 6 decodificações e redimensionamentos por foto, e as duas variantes rodam em paralelo (`Promise.all`) na mesma função de 1 vCPU.
3. `'heif'` está em `supported`, mas o binário pré-compilado do sharp não decodifica HEVC (HEIC do iPhone). `metadata()` passa, o `toBuffer()` falha com um erro que não é `InvalidImageError`, e o resultado vira 500 em vez de 400.

**Cenário concreto:** o front sempre manda JPEG de no máximo 2048 px (`client-resize.ts`), mas a API é um contrato próprio, que também roda standalone e em Docker. Uma chamada direta com token de admin e a imagem do item 1 ocupa a função por segundos e centenas de MB, cai no timeout do API-02 e grava depois do 504.
**Correção sugerida:** `sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })`; checar `metadata.width * metadata.height` antes de processar; decodificar uma vez (`const base = sharp(input).rotate()`, depois `base.clone().resize(...)`); remover `heif` (ou aceitar só quando `metadata.compression === 'av1'`).
**Esforço:** P

### API-06 | P2 | `apps/api/src/shared/ordering/move-in-order.ts:22-23` e `packages/core/src/rules/reorder.ts:8-16`
**Problema:** mover um id que não está na lista responde 409 "já está no limite" em vez de 404. `findIndex` devolve -1, `items[-1]` é `undefined`, a função devolve `null` e o service lança `ConflictError(edgeMessage)`.
**Cenário concreto:** o admin apaga um destaque numa aba e clica em "subir" na outra. Recebe "Este destaque já está no limite da lista.", uma mensagem errada. Vale para categorias e destaques. Produtos escapam porque `moveProduct` chama `findCategoryId` antes.
**Correção sugerida:** em `swapSortOrders` (core), devolver um resultado discriminado (`{ kind: 'not-found' } | { kind: 'edge' } | { kind: 'swap', neighborId }`), ou fazer `moveInOrder` checar `items.some(i => i.id === id)` e lançar `NotFoundError` com uma mensagem por módulo. Adicionar um teste no core e outro no `move-in-order.test.ts`.
**Esforço:** P

### API-07 | P2 | `apps/api/src/modules/products/products.service.ts:57-60` (com `supabase/migrations/20261014120000_audit_and_sort_order_triggers.sql:136-138`)
**Problema:** trocar a categoria de um produto pelo `PUT` mantém o `sort_order` antigo. O trigger `assign_sort_order` só roda em `before insert`, e o service não trata a mudança de categoria.
**Cenário concreto:** a categoria A tem produtos com `sort_order` 0, 1 e 2; a categoria B tem 0 e 1. O produto B(1) é movido para A, que passa a ter 0, 1, 1, 2. Clicar em "subir" ou "descer" entre os dois itens com `sort_order` 1 chama `swap_product_sort_orders`, que troca 1 por 1. A resposta é 204 e nada muda na tela.
**Correção sugerida:** no service, se `record.category_id` for diferente da categoria atual, pedir ao repositório `nextSortOrder(categoryId)` e incluir no update. O ideal é um trigger `before update of category_id` com o mesmo advisory lock; registrar isso para o revisor de banco. Adicionar um teste de serviço.
**Esforço:** P

### API-08 | P2 | `apps/api/src/modules/products/products.service.ts:115-124` e `apps/api/src/shared/supabase/database-errors.ts:13-15`
**Problema:** a violação de FK (23503) vira `ReferencedRecordError`, documentado como "exclusão barrada", mas no insert/update de produto o mesmo código significa "categoria inexistente". `ProductsService` só trata `UniqueViolationError`, então o erro sobe como 500.
**Cenário concreto:** o admin abre "Novo produto", outra pessoa apaga a categoria escolhida, e o admin salva. A resposta é 500 "Não foi possível concluir..." e o caso é logado como falha de servidor, em vez de 400 com `fieldErrors.category_id = ['Escolha uma categoria válida.']`.
**Correção sugerida:** separar os erros em `ReferencedRecordError` (delete) e `MissingReferenceError` (insert/update), por exemplo decidindo pela operação no repositório, ou deixar o `translateDatabaseError` receber o contexto. Em `ProductsService.create/update`, mapear para `ValidationError` no campo `category_id`.
**Esforço:** P

### API-09 | P2 | `packages/core/src/rules/parse-price.ts:18-19` e `packages/core/src/schemas/product.ts:16`
**Problema:** o preço não tem teto. `parsePriceBRL` aceita até `Number.MAX_SAFE_INTEGER`, mas a coluna é `integer` (no máximo 2.147.483.647 centavos).
**Cenário concreto:** com "R$ 30.000.000,00" (um zero a mais por engano), o Postgres devolve 22003 (numeric out of range) e a resposta é 500 genérico, reportado como erro de servidor, em vez de uma mensagem no campo preço.
**Correção sugerida:** criar `MAX_PRICE_CENTS` no core (um teto de negócio, por exemplo R$ 10.000,00 = 1_000_000) e fazer `parsePriceBRL` devolver `null` acima dele. Também `price: z.string().trim().min(1).max(20)`. Testar no core.
**Esforço:** P

### API-10 | P2 | `apps/api/src/shared/auth/require-admin.ts:24-29`
**Problema:** o middleware consulta `profiles` direto pelo cliente Supabase, fora de repositório, e decide a regra "admin ativo" dentro da camada HTTP. É a única leitura de tabela fora de `*.repository.ts` na API. As regras do ESLint (`eslint.config.mjs`) protegem controller e service, mas não `shared/auth`.
**Cenário concreto:** se a regra mudar, por exemplo para um papel `gerente` com escrita parcial, ela será editada no middleware. Testar exige montar o fake encadeado de `from().select().eq().maybeSingle()` (`test-support/admin-clients.ts:13-20`).
**Correção sugerida:** criar `AdminProfileRepository.findById(userId)` e uma função pura `isActiveAdmin(profile)` (que pode ficar no core); o middleware só orquestra. Estender a regra de lint de `@supabase/*` para `shared/auth/**`.
**Esforço:** P

### API-11 | P2 | `apps/api/src/modules/media/image/image.service.ts:66-72`
**Problema:** o `catch {}` sem variável engole qualquer erro do `setImagePath` (rede, RLS, bug) e sempre devolve `ConflictError` (409) sem `reportServerError`. O caso "o registro sumiu" (`record_missing`) também vira 409, com a mensagem "A foto anterior foi mantida", quando não existe mais item.
**Cenário concreto:** uma policy quebrada no stage faz todo upload responder 409 "não pôde ser vinculada", e não aparece nenhuma linha de erro no log da Vercel. O problema fica invisível.
**Correção sugerida:** `catch (error) { await this.removeStaged(...); if (error is RecordMissing) throw new NotFoundError(notFound); reportServerError({ event: 'image.link_failed', error }); throw new ConflictError(...) }`. Fazer o repositório devolver `false` em vez de o service lançar `new Error('record_missing')` para depois capturar o próprio erro.
**Esforço:** P

### API-12 | P2 | `apps/web/src/app/admin/(painel)/midia/video/route.ts:119-134, 176-179, 208-215` (e `next.config.ts`/`maxDuration = 180`)
**Problema:** o ffmpeg roda dentro da requisição, com limites só parcialmente controlados:
1. `withTimeout` rejeita, mas não aborta o download e o upload do Storage, que continuam em segundo plano. O `finally` tenta remover `stagedOutputPath` antes de o upload terminar, e o arquivo pode aparecer depois, órfão até a próxima faxina daquele produto.
2. Com Fluid Compute, a Vercel reaproveita a mesma instância para requisições simultâneas: dois envios de vídeo ao mesmo tempo disputam 1 vCPU (libx264 sem `-threads` fixo, porque `threads` nunca é passado pelo route) e podem estourar `VIDEO_PROCESSING_TIMEOUT_MS`.
3. O bruto de até 50 MB é carregado inteiro em memória (`raw.arrayBuffer()` e depois `writeFile`) em vez de ir em stream para o disco.

**Cenário concreto:** dois admins, ou duas abas, enviando vídeos de 15 s em 1080p ao mesmo tempo. Os dois recebem 504 "A compactação demorou mais que o esperado", e o que foi gerado fica órfão no bucket.
**Correção sugerida:** usar `AbortController` no download e no upload (o supabase-js aceita `signal` via `fetch` customizado); passar `threads: 1` e documentar que é 1 vídeo por instância; fazer stream do download para o arquivo (`Readable.fromWeb(raw.stream())` com `pipeline` até `createWriteStream`). Num segundo momento, levar a compactação para uma fila ou worker fora da Function, porque a Vercel não é o lugar ideal para isso.
**Esforço:** M

### API-13 | P3 | duplicação da regra "apagar mídia se ninguém mais usa"
**Arquivos:** `apps/api/src/modules/products/products.service.ts:91-104` (`cleanupMedia`), `apps/api/src/modules/media/image/image.service.ts:111-119` (`removeIfUnused`), `apps/api/src/modules/media/image/remove-image-if-unused.ts:11-22` (helper que só categorias e destaques usam), `apps/api/src/modules/products/products.repository.ts:99-107` (`isVideoInUse`), `apps/web/.../video/route.ts:260-281`, `apps/web/src/features/media/server/actions.ts:89-105`, `apps/web/src/features/media/server/video/storage-cleanup.ts:98-99`.
**Problema:** a mesma regra está implementada 6 vezes, e quatro delas fazem a mesma consulta de referência de vídeo.
**Cenário concreto:** para mudar de "loga e segue" para "enfileira para retry", é preciso editar 6 lugares.
**Correção sugerida:** criar um serviço `MediaCleanup` com `removeImageIfUnused(target, path)` e `removeVideoIfUnused(path)` e injetá-lo nos services. Apagar `cleanupMedia` e `removeIfUnused`.
**Esforço:** M

### API-14 | P3 | `apps/api/src/modules/products/products.service.ts:82-84`
**Problema:** a linha `if (!media) return;` é código morto, porque `ensureFound(media !== null)` já lançou o erro. Ela só existe para o TypeScript estreitar o tipo, e isso mostra que `ensureFound(boolean)` não informa o estreitamento.
**Cenário concreto:** quem lê o código acha que existe um caminho "não achou e mesmo assim não deu erro".
**Correção sugerida:** trocar por `private requireFound<T>(value: T | null): T` (ou `asserts value is T`) e usar `const media = this.requireFound(await this.repository.delete(id))`. Vale o mesmo para `categories.service.ts:72-73` e `highlights.service.ts:59-60` (`deleted?.imagePath`).
**Esforço:** P

### API-15 | P3 | `withUniqueSlug` e `ensureFound` copiados
**Arquivos:** `products.service.ts:115-128`, `categories.service.ts:91-104`, `highlights.service.ts:69-71`; `createImageService` copiado em `products.module.ts:16-17`, `categories.module.ts:20-22` e `highlights.module.ts:20-22`.
**Problema:** o código é duplicado entre services e modules.
**Cenário concreto:** com uma nova regra de slug (por exemplo um sufixo automático), as duas cópias divergem.
**Correção sugerida:** um helper `translateUniqueSlug(save, messages)` em `shared/errors`, um `requireFound` genérico e um `createImageService` exportado por `media/image/image.module.ts`.
**Esforço:** P

### API-16 | P3 | dependências concretas e inconsistentes entre repositórios
**Arquivos:** `products.repository.ts:12` e `highlights.repository.ts:10` recebem `SupabaseImageRepository` (a classe), enquanto `categories.repository.ts:12` recebe `Pick<ImageRepository, ...>`.
**Problema:** três jeitos para a mesma dependência. Além disso, os repositórios de produto, categoria e destaque fazem proxy de métodos de imagem (`isImageInUse`, `removeImageFiles`) só para cumprir interfaces de service que misturam duas responsabilidades (`CategoryRepository extends DeletedRecordImageStore`).
**Correção sugerida:** os services recebem `MediaCleanup` (API-13) como segunda dependência, e os repositórios voltam a cuidar só da própria tabela.
**Esforço:** M

### API-17 | P3 | `apps/api/src/modules/menu/menu.service.ts:13-22`, `products.service.ts:23`, `categories.service.ts:25`, `highlights.service.ts:21`, `store.service.ts:14`
**Problema:** as interfaces de repositório devolvem `unknown`/`unknown[]`, e os services reconstroem o tipo com `zod.parse` a cada requisição. O resultado é código forçado (`hasDifferentId(value: unknown, ...)`, `Array.isArray(relatedProducts) ? ... : relatedProducts` em `menu.service.ts:50-52`) e o custo de validar o cardápio inteiro em cada GET público.
**Cenário concreto:** o leitor não sabe pela interface o que o repositório devolve. O filtro de relacionados tem um ramo para "não é array" que nunca acontece.
**Correção sugerida:** tipar o retorno dos repositórios com `Database['public']['Tables'][...]['Row']` (já gerado em `database.types.ts`) ou com os tipos do contrato, e validar com Zod só nos testes de contrato ou e2e (ou uma vez, no repositório).
**Esforço:** M

### API-18 | P3 | `apps/api/src/modules/menu/menu.controller.ts:8-13`
**Problema:** o controller usa um estilo diferente dos outros (`.then(...)` em vez de `async/await`) e `context.req.param('slugOrId')!` com non-null assertion. O `slugOrId` não tem validação de tamanho nem de formato: qualquer string vai para `.eq('slug', ...)`.
**Correção sugerida:** criar um `readSlugOrIdParam` em `request-input.ts` (regex do slug ou UUID, `max(120)`; inválido vira 404) e usar `async/await` como nos demais controllers.
**Esforço:** P

### API-19 | P3 | envelope de erro montado em 4 lugares
**Arquivos:** `app.ts:35-37` (notFound), `media/image/image-body-limit.ts:7-11` (413), `health/health.controller.ts:11` (503), `shared/http/error-handler.ts:17-20`.
**Problema:** o formato `{ status: 'error', message }` é repetido à mão. Os códigos 413 e 503 não estão em `ErrorStatus`. O `requestId` não volta no corpo do erro (só no header), o que dificulta o suporte ("me manda o código do erro").
**Correção sugerida:** criar `errorResponse(context, status, message, fieldErrors?)` em `shared/http`, adicionar `PayloadTooLargeError` mapeado a 413 e incluir `requestId` no envelope (o `apiErrorResponseSchema` aceita `.optional()`).
**Esforço:** P

### API-20 | P3 | `apps/api/src/shared/observability.ts:13-14` e chamadas em services
**Problema:** os erros reportados pelos services (`product.image_cleanup_failed`, `image.previous_cleanup_failed`) saem sem `requestId`, como o próprio comentário admite, então não dá para correlacionar com a requisição.
**Correção sugerida:** um `AsyncLocalStorage` com o `requestId`, preenchido no `requestIdMiddleware` e lido em `reportServerError`.
**Esforço:** P

### API-21 | P3 | `apps/api/src/shared/auth/require-admin.ts:20-28`
**Problema:** toda requisição de admin faz 2 idas e voltas em série antes da regra: `auth.getUser` (rede até o GoTrue) e a consulta a `profiles`. Uma tela do painel que faz 3 chamadas gera 6 idas e voltas só de autenticação.
**Correção sugerida:** usar `supabase.auth.getClaims(token)` (verificação local com chaves assimétricas/JWKS) e manter só a consulta ao perfil, ou guardar a role em custom claim e confirmar `is_active` por consulta.
**Esforço:** M

### API-22 | P3 | `packages/core/src/contracts/admin-api.ts:94-100`
**Problema:** o `slug` de produto não tem `max`, enquanto o de categoria tem `max(80)` (`schemas/category.ts:19`). O regex de slug está copiado em 3 lugares (`admin-api.ts:98`, `schemas/category.ts:20`, `schemas/product.ts:28`).
**Correção sugerida:** um `slugSchema` único no core (`min(2).max(80).regex(...)`), reaproveitado pelos três.
**Esforço:** P

### API-23 | P3 | `packages/core/src/rules/reorder.ts:3-17`
**Problema:** a regra se chama `swapSortOrders`, o mesmo nome do método de repositório que chama a RPC, e calcula os `sort_order` trocados, que ninguém usa (`move-in-order.ts:24` só lê `pair[1].id`).
**Correção sugerida:** renomear para `findNeighbor(items, id, direction)` devolvendo o vizinho ou o motivo (junto com o API-06).
**Esforço:** P

### API-24 | P3 | `packages/core/src/schemas/store-settings.ts:35-38`
**Problema:** a regra `close > open` impede horários que passam da meia-noite (18:00–01:00), comuns em lanchonete. `opening-hours.ts:121` também não trata esse caso.
**Correção sugerida:** é uma decisão de produto. Se for necessário, aceitar `close <= open` como "fecha no dia seguinte" e ajustar `getStoreStatus`/`nextOpening`, com testes.
**Esforço:** M

### API-25 | P3 | Zod 4: APIs depreciadas
**Arquivos:** `apps/api/src/config/env.ts:4,8` (`z.string().url()`), `shared/http/request-input.ts:42` e `menu/menu.service.ts:61` (`z.string().uuid()`), `core/contracts/admin-api.ts:42`, `core/schemas/product.ts:17,25-26`. Em contraste, `store-settings.ts:26` já usa `z.url()`.
**Correção sugerida:** trocar por `z.url()` e `z.uuid()` e padronizar.
**Esforço:** P

### API-26 | P3 | arquivos legados
**Arquivos:** `apps/api/src/index.ts`, `apps/api/vercel.json`, a entrada `index` em `apps/api/scripts/build.mjs:15`.
**Problema:** existem só para o projeto Vercel `salgae-api-stage`, como diz `docs/planejamento/dois-projetos-por-ambiente.md:38-39,108-109`. Junto com o `Dockerfile` e o `server.ts`, a API tem 3 formas de deploy mantidas (embutida, Vercel standalone e Docker), e só a embutida é usada no stage e em produção.
**Correção sugerida:** assim que o `salgae-api-stage` for excluído, abrir o PR planejado removendo `index.ts`, `vercel.json` e a entrada `index` do build. Decidir se o Docker e o `server.ts` ficam como "modo standalone documentado" ou saem também; se ficarem, adicionar um smoke test de build no CI.
**Esforço:** P

### API-27 | P3 | `apps/api/src/modules/media/image/image.controller.ts:25` e `image.service.ts:61`
**Problema:** a checagem de arquivo vazio aparece duas vezes, no controller e no service. A checagem `file.type.startsWith('image/')` confia no MIME declarado pelo cliente; o sharp valida depois, então isso é só uma mensagem mais cedo, não uma garantia.
**Correção sugerida:** deixar a checagem de presença e tamanho no controller (entrada HTTP) e a validação de conteúdo no service/compressor.
**Esforço:** P

---

## Testes que faltam

**API (`apps/api`)**
- Autorização em todas as rotas de escrita: um `it.each` sobre `[POST /, PUT /:id, PUT /:id/situation|active, POST /:id/order, POST|DELETE /:id/image, DELETE /:id]` de produtos, categorias, destaques e loja, esperando 401 sem token e 403 com perfil não-admin. Hoje só `GET /` é testado em cada módulo (`products.routes.test.ts:80`, por exemplo).
- `ImageService`: `remove` de produto com vídeo (409 `productHasVideo`), `upload` com registro inexistente (404), mapeamento `ImageTooSmallError`/`InvalidImageError` para 400, `setImagePath` devolvendo `false` (API-11), e a corrida de dois uploads (API-03) depois da correção.
- Rota de upload, caminho feliz: multipart válido responde 201 `{ path }`. Hoje só 413 e 400 estão cobertos.
- `image-compressor`: imagem com ruído acima do alvo (API-04), entrada acima do limite de pixels e HEIC (API-05).
- `ProductsService.moveProduct`: produto inexistente (404), e mover só dentro da própria categoria.
- `moveInOrder` e o core `reorder`: id ausente (API-06).
- `ProductsService.update` com troca de categoria e `sort_order` (API-07), e categoria inexistente respondendo 400 (API-08).
- Timeout: um handler lento não grava depois do 504 (API-02), depois da correção.
- Menu: produto com `video_path` e sem imagem no repositório não pode derrubar o `GET /v1/menu` inteiro. Hoje o `publicMenuResponseSchema.parse` falha a lista toda. Decidir se é esse o comportamento desejado e testar.

**Core (`packages/core`)**
- `product-situation.ts` não tem nenhum teste: ida e volta de `fieldsFromProductSituation` e `productSituationFromFields`.
- `parsePriceBRL`: teto (API-09), "1.000.000,00", espaços internos.
- `highlight.ts` não tem teste próprio no core (só um caso de rota na API): `//evil.com`, `/\\evil`, `javascript:`.

**Vídeo (`apps/web`)**
- O `route.ts` tem teste, mas a lógica de banco e Storage está acoplada ao handler. Depois do API-01, testar o `VideoService` com fakes: commit, rollback, limpeza do anterior e corrida.

**Testes que olham implementação em vez de comportamento**
- `image-compressor.test.ts:20-22` ("usa qualidades limitadas a 82, 76 e 70") testa o valor de uma constante. Trocar por "o detalhe fica abaixo de X KB para uma foto típica".
- `supabase-client-factory.test.ts:26-35`: "cria o cliente público com a chave anônima" só faz `toBeDefined()` (o nome promete o que o teste não confere), e "cliente novo por requisição" compara identidade de objeto. O `it.each` de `no-store` logo abaixo é bom.
- `image.service.test.ts:22-44` confere a ordem exata de chamadas. É aceitável porque a ordem é o próprio invariante ("só apaga a antiga depois de vincular a nova"), mas fica frágil se surgir um passo intermediário. Vale manter só as asserções relativas (`indexOf('update-record') < indexOf('remove-old')`).
- Consistência: `menu.routes.test.ts` e `menu.service.test.ts` têm nomes em inglês; o resto da suíte está em português.

---

## O que falta no backend

1. **Módulo de vídeo na API** (API-01), com o mesmo desenho do de imagem: controller, service, repositório e adaptador ffmpeg.
2. **Serviço único de limpeza de mídia** (API-13 e API-16) e uma faxina periódica também para imagens órfãs (hoje só existe para vídeo, e só é disparada por ação do admin).
3. **Concorrência otimista** nas gravações de mídia (API-03). Opcionalmente também no `PUT` de produto/categoria (`updated_at` como versão), para dois admins não sobrescreverem um ao outro sem saber.
4. **Cancelamento cooperativo** (`AbortSignal`) do timeout até os repositórios (API-02).
5. **Repositório de perfil** e regra de admin fora do middleware (API-10).
6. **Cabeçalhos de cache** nos GETs públicos (`/v1/menu`, `/v1/store`, `/v1/menu/sitemap`), hoje sem `Cache-Control`. O Next invalida por tag, mas a API standalone fica sem cache nenhum.
7. **Contrato documentado**: os schemas do core já existem; `@hono/zod-openapi` (ou um gerador) daria OpenAPI de graça e ajudaria outro dev a entender a API sem ler o código.
8. **`requestId` no corpo do erro e nos logs dos services** (API-19 e API-20).
9. **Limpeza dos legados** depois de excluir o `salgae-api-stage` (API-26).

---

## Pontos fortes

- As camadas são bem montadas na API: routes, controller, service e repository, com injeção por factory (`ServiceFactory`) e regras de lint que impedem controller e service de importar Supabase ou repositório.
- Os erros de domínio (`DomainError`) ficam separados dos erros de persistência (`UniqueViolationError`/`ReferencedRecordError`), com um mapeador HTTP único e um envelope JSON consistente que não vaza mensagem interna (testado).
- O cliente Supabase é criado por requisição com o token do usuário, então o RLS vale também dentro da API. `no-store` é forçado (testado).
- As trocas de ordenação são atômicas por RPC, com `for update`, e a posição é atribuída por trigger com advisory lock.
- O fluxo de imagem é cuidadoso: sobe primeiro, vincula depois, só então apaga a antiga, com rollback do que foi enviado se o vínculo falha e checagem de referência antes de apagar.
- O pipeline de vídeo é robusto no nível do processo: sem shell, `-protocol_whitelist file`, demuxer escolhido pela assinatura e não pelo MIME, kill com SIGKILL no timeout, validação da saída (faststart, codec, dimensões) e fallback de qualidade.
- Os testes são, em geral, de comportamento, com fakes no lugar de mocks profundos, e as mensagens estão em português claro. As suítes da API e do core passam (107 e 40 testes).

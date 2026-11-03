# Plano: um projeto Vercel por ambiente

Situação: **aprovado com consenso entre Claude e Codex em 2026-11-03**, depois de 3 revisões e 14
mudanças. Implementação ainda não iniciada.

## Decisão do responsável (2026-11-03)

Dois projetos na Vercel, um de teste e um de produção: `salgae-homologacao` e `salgae-producao`.
O projeto `salgae-api-stage` deixa de existir no fim, e não se cria `salgae-api-producao`.

## Objetivo

Cada ambiente publica site e API juntos, em um único projeto, sem perder o que a separação
trouxe: a API continua em `apps/api`, com rotas, controllers, services e repositories, e o
frontend continua sem acessar o banco nem processar mídia fora dessa fronteira.

## Alternativas avaliadas

| Alternativa | Avaliação |
| --- | --- |
| **API embutida no Next (proposta)** | Recurso estável, sem chamada de rede entre site e API e sem variáveis novas. Exige ajustar cache, imports e tempo limite. |
| Vercel Services | Beta. Os bindings só existem em tempo de execução, não no build, e o site gera páginas com dados da API no build. A documentação não cobre Hono, npm workspaces, Root Directory nem conversão de projeto existente. |
| Site chamando a si mesmo por HTTP | Mantém o cache atual, mas o build não tem servidor para responder e cada leitura vira duas invocações. |
| Site chamando os services direto | Perde Hono, validação HTTP e mapeamento de erros no caminho que o site usa. |

## Proposta

### Pacote da API

1. `apps/api/package.json` ganha `exports` com `./embedded` apontando para `src/embedded.ts`. O
   web declara `@salgae/api` como dependência, entra em `transpilePackages` e o lockfile é
   atualizado.
2. `src/embedded.ts` exporta uma função que recebe `{ supabaseUrl, supabaseAnonKey }` e cria o app.
   Importar o módulo não lê variáveis de ambiente.
3. A configuração embutida e a da API sozinha são tipos separados. `loadEnv()` continua exigindo
   `WEB_ORIGIN` para `server.ts`. `createApp` recebe `corsOrigin` opcional e só instala o CORS
   quando ele existe; no modo embutido não há CORS.
4. `src/index.ts` e `apps/api/vercel.json` existem só para o projeto Vercel da API e continuam até ele
   ser excluído, para `salgae-api-stage` seguir publicando e servir de retorno durante a validação.
   Saem em um PR próprio depois da exclusão, junto com a entrada `index` de `scripts/build.mjs`.
5. Os imports relativos de `apps/api/src` perdem a extensão `.js` (234 linhas em 70 arquivos), em um
   commit só com essa mudança, provado pelo build do web e pelo da API.

### Adaptador no site

6. `apps/web/src/lib/api/embedded-api.ts` é o único arquivo que importa `@salgae/api`, por exceção do
   ESLint restrita a `src/lib/api/**`. Ele guarda um singleton preguiçoso do app e exporta:
   - `embeddedApiFetch`, que os clientes público e admin recebem como `fetchImplementation` e que
     resolve os caminhos relativos contra uma origem interna absoluta;
   - `handleApiRoute`, que valida e remove o prefixo `/api` e preserva método, headers e corpo.
7. `apps/web/src/app/api/[...caminho]/route.ts` só repassa para `handleApiRoute`. Exporta `GET`,
   `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` e `OPTIONS`, em runtime Node.
8. `API_URL`, `getApiEnv` e seus testes são removidos. `createPublicApiClient` e
   `createAdminApiClient` deixam de receber `apiUrl`, e `fetchImplementation` passa a ser obrigatório.

### Cache

9. A fábrica Supabase da API injeta um `fetch` com `cache: 'no-store'`. Assim o painel nunca lê dado
   guardado pelo `fetch` do Next. No Next 16.4.2, `no-store` dentro de `unstable_cache` não torna a
   página dinâmica (`patch-fetch.js:378`).
10. As leituras públicas passam a usar `unstable_cache` com 60 s e as tags atuais. A função de produto
    é criada por chamada, com chave e tag derivadas do `slugOrId`, para manter `product:<slug>`.

### Tempo limite

11. Fica um só tempo limite: o `requestTimeoutMiddleware` do Hono, de 15 s. `timeout-fetch.ts` é
    removido, porque abortar um `signal` não interrompe `app.fetch`. A rota e os segmentos do painel
    que executam Server Actions ficam com `maxDuration` acima desses 15 s, conferido no deploy, e um
    teste com handler atrasado prova a resposta de tempo esgotado. O middleware encerra a espera, mas
    não cancela a consulta em andamento; no build, o 504 faz a geração falhar de forma explícita.

### Vídeo e API sozinha

12. A rota `/admin/midia/video` continua no Next. A etapa E1 do plano v3, que levaria o vídeo para a
    API, sai do escopo: não há ganho com os dois no mesmo projeto.
13. `server.ts` e `Dockerfile` continuam, para um cliente que queira a API em servidor separado.

## Testes e CI

- **Unidade:** singleton, remoção de `/api`, métodos, headers, `FormData`, `fetch` com `no-store` e
  chaves e tags dinâmicas de produto.
- **E2E:** `e2e/env.ts`, `e2e/playwright.config.ts`, `e2e/api/auth-tokens.ts` e os specs de `e2e/api`
  usam `${baseURL}/api`. Saem `E2E_API_URL`, `apiPort`, `API_URL` e o servidor separado.
- **Build:** o job E2E constrói o web sem API no ar; o resumo do `next build` deve manter as páginas
  públicas estáticas com revalidação.
- **Mídia:** E2E de envio com 3,75 MB pela rota `/api` e com foto de mais de 2 MB pelo painel. Conferir nos `.nft.json` os binários do `sharp` e
  medir o tamanho das funções.
- **Resiliência:** `e2e/scripts/api-fora-do-ar.sh` vira um teste de banco fora do ar: aquecer as
  páginas, parar o Supabase local, esperar mais de 60 s e confirmar que elas seguem entregando o
  último valor. Roda no fim do job, porque derruba o banco.
- **Dockerfile:** o job E2E faz `docker build`, sobe a imagem e consulta `/health` antes de parar o
  Supabase, porque `/health` lê o banco. O CI é o único lugar que prova isso, porque o Docker Desktop
  não sobe nesta máquina.

## Documentação

`README.md` (inclusive as afirmações sobre vídeo e API), `apps/web/.env.example`,
`apps/api/.env.example`, `docs/planejamento/e9-passos-na-vercel.md` e as notas 09 e 25 do vault.

## Ordem de execução

1. Consenso deste plano entre Claude e Codex; PR de documentação com o plano e a decisão.
2. Branch `refactor/dois-projetos`, começando pelo commit dos imports.
3. Lint, typecheck, testes, knip e build sem API no ar; revisão do Codex em job novo até aprovar.
4. PR para a `develop` e CI verde. No merge, `salgae-homologacao` publica sem `API_URL`.
5. Conferir o stage no navegador, inclusive escrita no painel com o login do responsável, tamanho
   das funções na Vercel e `/api/health`.
6. O responsável exclui `salgae-api-stage` e as variáveis que sobraram; depois, PR que remove
   `src/index.ts` e `apps/api/vercel.json`.
7. Atualizar dependências (#76), configurar `salgae-producao` com Root Directory `apps/web` e
   promover para a `main` **somente com o "sim" do responsável**.

## Depois desta mudança

Pedido do responsável para o final: animação de login no botão "Entrar no painel", enquanto o login
acontece, respeitando a preferência de menos animação. Fica em PR próprio, depois do passo 5.

## Fora do escopo

Produção, migrations e mudanças de tela ou de contrato da API, além da animação acima.

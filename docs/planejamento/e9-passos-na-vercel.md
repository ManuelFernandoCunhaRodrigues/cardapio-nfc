# E9 — passos na Vercel (com o responsável)

Status: **aguardando o responsável** (2026-10-31). Desde 2026-10-31 o que é Vercel ou Supabase
ele faz pelo Codex, na conta pessoal dele (time `manuelfernandocr4-5200s-projects`). Este é o
roteiro do que falta do plano v3 (`plano-v3-estrutura-playwright-motion.md`, etapas E1 e E9);
o resto (E0, E2–E8) já está na integração `refactor/estrutura-completa` (PR rascunho #74).

Tudo aqui usa **projetos de teste no plano Hobby** e o **banco do stage**. Produção não muda.

## 1. API de teste — `salgae-api-stage` (substitui a prova de conceito da E1)

1. Novo projeto Vercel ligado ao repositório, branch `refactor/estrutura-completa`.
2. **Root Directory:** `apps/api`, com "Include files outside the root directory" ligado
   (a API embute o `packages/core`). Framework: Hono. `apps/api/vercel.json` define `dist` como
   pasta de saída, e a entrada vira `dist/index.js` do `npm run build`: sem isso a Vercel usa `src/index.ts`
   sem empacotar e a função cai com `ERR_MODULE_NOT_FOUND` ao importar o `@salgae/core`.
3. **Variáveis** (as mesmas do stage, nenhuma nova):
   - `SUPABASE_URL` = `https://csirmtmerqpbhatruzaf.supabase.co`
   - `SUPABASE_ANON_KEY` = chave anônima/publicável do stage
   - `WEB_ORIGIN` = origem da prévia do site (passo 2), só a origem, sem barra no fim
4. Conferir: `GET <url-da-api>/health` → `{"status":"ok"}` e `GET <url-da-api>/v1/menu` → JSON
   do cardápio. Anotar a URL.

O vídeo continua no Next (plano B da E1) até alguém decidir movê-lo; nada disso depende dele.

## 2. Prévia do site — `salgae-web-previa`

1. Novo projeto Vercel, mesma branch, **Root Directory** `apps/web` (com "Include files outside
   the root directory" ligado).
2. **Variáveis:** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (stage),
   `API_URL` = URL da API do passo 1, `NEXT_PUBLIC_SITE_URL` = URL da prévia.
   `NEXT_PUBLIC_SITE_ENV` ausente (bloqueia buscadores).
3. A API tem de estar no ar antes do build: o site gera as páginas públicas com os dados dela.

## 3. Conferência (Claude)

Com as duas URLs, o Claude confere no navegador: cardápio, busca, produto, carrossel (arrasto),
painel (gaveta, confirmação, reordenação, foto e vídeo) e, no celular de verdade, o formulário
de destaque (no Pixel 7 emulado o botão "Criar destaque" ficou encoberto). Depois, revisão final
do Codex sobre a integração inteira.

## 4. Stage (só com o "sim" do responsável)

1. `salgae-homologacao`: Root Directory `apps/web` e variável `API_URL` apontando para a API.
2. `salgae-api-stage` passa a publicar a `develop`.
3. Merge do #74 na `develop` e conferência de novo no stage.

`salgae-producao` não muda neste plano.

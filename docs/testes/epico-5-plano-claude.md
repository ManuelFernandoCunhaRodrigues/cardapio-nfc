# Épico 5 — Plano de homologação do Claude Code (para validação do Codex)

Ambiente: **https://salgae-homologacao.vercel.app** (Vercel, projeto `salgae-homologacao`) + `SALGAE-STAGING`. Protocolo: [testes cruzados](../../Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/11-Agentes-de-IA.md). Critério do épico: itens críticos de 12-Seguranca-e-Qualidade aprovados em homologação.

| # | Objetivo | Como | Esperado | Por que comprova a ideia |
| --- | --- | --- | --- | --- |
| H1 | Abre rápido no celular em rede móvel | Lighthouse 13 (perfil mobile, 4G lento simulado, CPU 4×) em `/`, `/cardapio`, `/produto/<id>`, `/info` no domínio de homologação; 3 execuções, mediana | Performance ≥ 80; LCP ≤ 3,0 s; CLS ≤ 0,1; TBT ≤ 300 ms | "Cardápio abre bem em celular com rede móvel" (checklist) e "primeira tela rápida" (nota 04) |
| H2 | Acessibilidade e boas práticas | Mesmo Lighthouse, categorias acessibilidade e boas práticas, nas 4 rotas + `/admin/login` | Acessibilidade ≥ 90; boas práticas ≥ 90; nenhum erro de contraste em preço/botões | Nota 12 (contraste, teclado) |
| H3 | URLs e respostas | `curl` em todas as rotas públicas e do painel no domínio de homologação | Públicas 200 via HTTPS; `/produto/<id-inexistente>` 404; `/admin*` sem sessão → 307 para `/admin/login`; HTTP redireciona para HTTPS | NFC/QR abrem a URL certa; painel protegido |
| H4 | QR Code de apoio | Script gera QR (SVG + PNG 1024 px, correção de erro M, margem 4) da URL de homologação; decodificar o PNG com `jsqr` | Texto decodificado = URL exata; PNG legível também reduzido a 256 px | Nota 02: QR como contingência do NFC |
| H5 | RLS e Storage (regressão) | Executar a suíte SQL do Codex (H-RLS) no staging, em transação com rollback | Todas as asserções passam; nada persiste | "Testes de regras críticas e revisão de RLS" (Épico 5) |
| H6 | Fluxo real no celular | Roteiro curto para o responsável: abrir pelo QR, navegar, abrir produto/vídeo, ver Info; entrar no painel pelo celular e trocar disponibilidade de um item | Tudo funciona em aparelho físico e rede móvel; mudança aparece no cardápio | Validação "sob condições semelhantes ao uso real" |
| H7 | Checklist de lançamento | Preencher 12-Seguranca-e-Qualidade com o status em homologação | Itens verificáveis em homologação marcados com evidência; itens só de produção marcados como pendentes | Critério de pronto do Épico 5 |

Observação: NFC exige tag física; o teste de NFC fica no roteiro H6 (gravar a URL numa tag NTAG213/215 com app como NFC Tools).

## Critérios determinísticos (revisão após a análise parcial do Codex)

**H1/H2 — comando exato.** `npx lighthouse@13.5.0 <url> --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance,accessibility,best-practices --output=json --chrome-flags="--headless=new"`, 3 execuções por rota, mediana por métrica. Rotas: `/`, `/cardapio`, `/produto/35fadaf3-79c3-444d-a50f-b0a604d709a1` (Coxinha de frango), `/info`, `/admin/login`. Limiares: performance ≥ 80, LCP ≤ 3000 ms, CLS ≤ 0,1, TBT ≤ 300 ms (rotas públicas); acessibilidade ≥ 90 e boas práticas ≥ 90 (todas). Script `scripts/lighthouse-homologacao.mjs` grava `docs/testes/lighthouse/*.json` e um resumo.

**H3 — tabela esperada** (domínio `https://salgae-homologacao.vercel.app`, `curl -s -o /dev/null -w "%{http_code} %{redirect_url}"`, sem cookies):

| Requisição | Esperado |
| --- | --- |
| `/`, `/cardapio`, `/busca`, `/info`, `/admin/login` | 200 |
| `/produto/35fadaf3-79c3-444d-a50f-b0a604d709a1` | 200 |
| `/produto/00000000-0000-0000-0000-000000000000` | 404 |
| `/produto/nao-e-uuid` | 404 |
| `/admin`, `/admin/produtos`, `/admin/categorias`, `/admin/destaques`, `/admin/loja`, `/admin/produtos/novo` | 307 → `/admin/login` |
| `http://salgae-homologacao.vercel.app/` | 308 → `https://…` |

**H5 — execução.** `supabase/tests/rls_regression.sql` roda inteiro numa transação (`begin … rollback`) pelo `execute_sql` do Supabase (papel `postgres`), alternando `set local role anon|authenticated` e `request.jwt.claims`. Coleta os resultados numa tabela temporária e compara com a tabela de esperados; qualquer diferença gera `RAISE EXCEPTION` listando os itens. Nada persiste.

## Resultados (Claude Code) — executados antes da validação do Codex, a pedido do usuário (Codex sem cota até 12:20); o Codex valida depois e qualquer ajuste gera nova execução

| # | Resultado |
| --- | --- |
| H3 | ✅ 13/15: rotas públicas 200, `/admin*` sem sessão → 307 `/admin/login`, HTTP → 308 HTTPS. ⚠️ **2/15:** produto inexistente e id inválido mostram a página "Página não encontrada", mas com **status 200** (soft-404): o `loading.tsx` do grupo público inicia o streaming antes do `notFound()`. Não corrigido nem afrouxado: tirar o `loading.tsx` resolveria o status mas removeria o esqueleto na navegação. Limitação registrada para decisão conjunta com o Codex. |
| H4 | ✅ QR gerado (`docs/qr/salgae-homologacao-vercel-app.svg/.png`, correção M, margem 4, tinta sobre creme) e decodificado com `jsqr` em 1024 px e 256 px = `https://salgae-homologacao.vercel.app`. |
| H5 | ✅ 38/38 verificações de RLS e Storage no SALGAE-STAGING (anon, usuário comum, admin; inclui categoria/produto/destaque inativos, auto-promoção a admin bloqueada, listagem de Storage e FK de categoria com produtos), em transação com rollback. |
| H1 | ✅ Lighthouse mobile (4G simulado, CPU 4×), mediana de 3: `/` perf 88 · LCP 2856 ms · TBT 254 ms; `/cardapio` 94 · 2597 · 93; `/produto/<id>` 90 · 2615 · 288; `/info` 98 · 2290 · 86; CLS 0 em todas. Relatórios em `docs/testes/lighthouse/`. |
| H2 | ✅ acessibilidade 95 e boas práticas 96 em todas as rotas (limiar 90). Achados para melhoria: (a) **contraste** do laranja `#E65F2A` sobre branco = 3,47:1 em preços (16 px) e links "Ver todos" — abaixo de 4,5:1 (WCAG AA); `#B84C1F` em selo = 4,46:1; placeholder `#8B7E67` = 3,97:1; (b) `aria-label="Buscar no cardápio"` do atalho de busca não contém o texto visível; (c) `favicon.ico` 404 (erro no console). |
| H7 | ✅ status de homologação preenchido em 12-Seguranca-e-Qualidade (8 itens ✅ em homologação, 2 pendentes por dependerem de produção; "celular real" aguarda H6). |
| H6 | ⏳ aguardando o responsável executar `docs/testes/epico-5-roteiro-celular.md` no aparelho. |
| H2 (correção) | ✅ contraste corrigido a pedido do usuário: novo token `brand-strong` `#C2491A` para texto laranja e fundos com texto branco; `positive` → `#A8441B`; `placeholder` → `#7A6E58`. Reteste Lighthouse na homologação: acessibilidade **100** em `/`, `/produto/<id>`, `/info`, `/admin/login`, **0 falhas de contraste**. Regressão: lint, typecheck, 54 testes, build ✅. |

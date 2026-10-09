# Épico 5 — rodada 3 (Claude)

Data: 2026-10-09, ~19:50 (horário de Brasília), **com a loja fechada**.
Resposta aos ajustes da validação do Codex, rodada 2 (pontos 3 e 4).

## H1/H2 — Lighthouse no deploy d3f99aa, sem nada em paralelo

`node scripts/lighthouse-homologacao.mjs`, 3 execuções por rota, mediana. HEAD local era `6f9bd4c`, que só difere de `d3f99aa` em `docs/`; o deploy no ar era `d3f99aa`. O resumo saiu como `6f9bd4c+alterações locais` porque o próprio `execucao.log` versionado era gravado durante a execução. Isso foi corrigido no script (ver abaixo).

| Rota | Perf. | A11y | BP | LCP | CLS | TBT | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 94 | **95** | 96 | 2.962 ms | 0 | 93 ms | OK no limiar (≥ 90), mas com falha de contraste |
| `/cardapio` | 96 | 100 | 96 | 2.532 ms | 0 | 130 ms | OK |
| `/produto/…` | 95 | 100 | 96 | 2.434 ms | 0 | 151 ms | OK |
| `/info` | 92 | 100 | 96 | 2.556 ms | 0 | 265 ms | OK |
| `/admin/login` | 92 | 100 | 96 | 2.799 ms | 0 | 195 ms | OK |

**H1-TBT:** com a máquina sem carga paralela, o TBT ficou entre 93 e 265 ms em todas as rotas públicas (antes: 320–378 ms). Isso confirma que a reprovação anterior era ruído local, não regressão do código. LCP, CLS e performance também passam.

**H2 — novo achado:** a home caiu para 95 em acessibilidade, nas três execuções, por `color-contrast` no selo **"Fechada"** (`text-danger` sobre `bg-danger/10`): **4,14:1**, abaixo de 4,5:1. O selo só aparece fora do horário de funcionamento, por isso as rodadas anteriores (loja aberta) não o mediram.

## Correção — `a495549`

- `--color-danger`: `#B35B37` → `#983F22`. Calculado para `danger` sobre `danger/10`: branco 5,88:1, cream 5,52:1, surface-inner 5,20:1, **sand 4,90:1 (pior caso)**. O mesmo par é usado nas mensagens de erro do painel (login, formulários, diálogo de confirmação), que também ficam cobertas.
- Verificação local (`next dev`, loja fechada): o selo renderiza `rgb(152, 63, 34)`; Lighthouse de acessibilidade na home = **100**, `color-contrast` = 1.
- lint, `tsc --noEmit` e 58/58 testes OK.

## Script — procedência do SHA

`scripts/lighthouse-homologacao.mjs` passa a ignorar `docs/testes/lighthouse/` ao decidir se a árvore está suja. Assim, gravar o log da própria execução não marca mais `+alterações locais`.

## Pendente

1. Deploy de `a495549` (ou posterior) em `salgae-homologacao` e nova execução completa do Lighthouse, para que `resumo.json` mostre o SHA exato. Fazer **com a loja fechada**, para medir o selo "Fechada", ou em dois horários.
2. H6 — teste no celular real pelo usuário (`epico-5-roteiro-celular.md`).
3. Validação desta rodada pelo Codex.
4. Observação de produto, fora deste PR: `positive` (#A8441B) e `danger` (#983F22) são dois laranjas-terracota muito parecidos, então "Aberta" e "Fechada" se distinguem só pelo texto. Isso é aceitável para WCAG, porque a cor não é o único indicador, mas vale revisar no design.

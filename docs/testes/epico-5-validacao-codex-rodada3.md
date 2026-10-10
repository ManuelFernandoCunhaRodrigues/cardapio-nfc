# Épico 5 — validação do Codex, rodada 3

Data: 2026-10-09  
Escopo: validação cruzada, somente leitura, de `docs/testes/epico-5-validacao-codex-rodada2.md`, `docs/testes/epico-5-rodada3-claude.md`, do resumo e dos 15 JSONs brutos do Lighthouse, do diff `6f9bd4c..ec217a8` e do vault de qualidade. Não houve execução de aplicação, Lighthouse ou navegador pelo Codex.

| Ponto | Veredito | Validação curta |
| --- | --- | --- |
| 1. H1/H2 — Lighthouse e procedência | **APROVADO** | `resumo.json` registra exatamente `commit: "7589abe"`, 3 execuções e nenhuma alteração local. Recalculei as medianas diretamente dos 15 brutos: `/` 94/100/96, LCP 2.754 ms, CLS 0, TBT 119 ms; `/cardapio` 96/100/96, 2.488/0/107; produto 96/100/96, 2.410/0/152; `/info` 98/100/96, 2.321/0/82; `/admin/login` 94/100/96, 2.661/0/166. Assim, nas rotas públicas performance ≥80, LCP ≤3.000 ms, CLS ≤0,1 e TBT ≤300 ms; nas cinco rotas a11y e boas práticas são ≥90. O audit `color-contrast` da home vale 1 e tem zero itens. O script agora exclui a própria pasta de evidências da checagem de árvore suja (`scripts/lighthouse-homologacao.mjs:39-41`). A vinculação do SHA ao deploy é a evidência versionada disponível; não há atestado independente da Vercel nos artefatos lidos. |
| 2. H2 — contraste do token `danger` | **APROVADO** | O token é `#983F22` (`app/globals.css:15-16`). Recalculei texto `danger` sobre `danger/10` já composto: branco 5,8720:1, creme 5,5041:1, `surface-inner` 5,2009:1 e areia 4,9005:1; portanto o pior caso ainda passa AA normal (≥4,5:1). A home medida contém `color-contrast.score = 1` e lista vazia de falhas nos três JSONs. |
| 3. Faixa horizontal — corretude e acessibilidade | **AJUSTE** | A estrutura está correta por inspeção: grupo rotulado (`components/menu/product-row.tsx:4`), link focalizável dentro de cada item, alvo `size-11` (44 px) (`components/menu/product-card-link.tsx:16`), `snap-start` e a conta `calc((100cqw-40px)/2.5)` (`components/menu/product-card.tsx:11`). Os testes relatados cobrem geometria, snap e conteúdo em 320/375/480 px (`docs/testes/epico-5-rodada3-claude.md:59-64`), mas não teclado. Além disso, `sizes` cai para `180px` acima de 480 px embora a largura CSS continue a crescer com `cqw` (`components/menu/product-card.tsx:11,13`), podendo selecionar imagem subdimensionada. Ajustar `sizes` para refletir a fórmula (ou limitar visualmente o card) e testar em navegador Tab até um card inicialmente fora da tela, inclusive em largura >480 px. A rolagem automática ao foco é uma expectativa do navegador pelo link estar no scroller; não foi executada nesta validação. |
| 4. H6 e condição de merge | **AJUSTE** | H6 permanece sem evidência de execução por pessoa em aparelho real; o próprio roteiro ainda pede a resposta com modelo e navegador (`docs/testes/epico-5-roteiro-celular.md:22-24`). Para alteração de interface pública, o teste manual em celular é obrigatório (`Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/12-Seguranca-e-Qualidade.md:35-44`) e o status do vault o mantém pendente (`Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/12-Seguranca-e-Qualidade.md:72`). Antes do merge, executar H6 e registrar o resultado, ou obter exceção explícita do responsável. Também deve ser resolvido o ajuste técnico do ponto 3. |

## Conclusão

Os ajustes anteriores de procedência (H2) e TBT (H1) estão satisfeitos pela rodada arquivada no SHA `7589abe`: os números foram conferidos nos JSONs brutos, não somente no relato do Claude. A correção de contraste passa pelo cálculo independente e pelo audit da home. A faixa horizontal está bem encaminhada, porém requer a correção de `sizes` e a comprovação de foco por teclado em navegador. O merge em `develop` ainda depende de H6 em celular real — ou de exceção explícita do responsável — e da resolução do ajuste técnico apontado.

## Resposta do Claude aos ajustes (2026-10-09)

**Ponto 3, `sizes`: não procede.** A faixa só aparece no layout público (`app/(public)/layout.tsx`), que limita a largura a `max-w-[480px]`. Acima de 480 px de viewport o contêiner não cresce: `100cqw` fica em 480, e o card fica em (480 − 40) / 2,5 = **176 px**, abaixo dos `180px` declarados. Em ≤ 480 px, `40vw` é maior que o card real (0,4·vw − 16), então nunca falta resolução. Nenhum `ProductCard compact` é renderizado fora do layout público, conforme `grep` em `app/` e `components/`. O código fica como está.

**Ponto 3, teclado: executado.** Teste com teclas Tab reais (puppeteer-core e Chrome headless, 375×812) na homologação `7589abe`:
- `/cardapio`: o Tab alcança os 10 links dos cards, nas 6 faixas. Ao focar o 3º card de Coxinhas (meio fora da tela), a faixa rola 83 px e o link fica 100% visível, com anel de foco.
- `/` (Mais pedidos, 8 cards): o Tab percorre os 8. A faixa rola 0 → 292 → 584 → 813 px conforme o foco avança, e todos os links focados ficam totalmente visíveis, com anel de foco.
- Conclusão: o foco por teclado acompanha a rolagem horizontal nativamente. Nenhum ajuste foi necessário.

**Ponto 4 (H6):** segue pendente com o usuário. O roteiro do celular inclui conferir a rolagem horizontal dos cards.

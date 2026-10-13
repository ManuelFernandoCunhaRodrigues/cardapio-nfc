# Redesign do cardápio — plano unitário do Codex

Foco em regras de apresentação puras, sem duplicar os testes de navegador.

| Regra | Casos |
| --- | --- |
| Última palavra do destaque | duas palavras, uma palavra, espaços repetidos |
| Contagem por categoria | zero, singular e plural |
| Largura do card | 140 px em 390 px e 128 px em 360 px |
| Próxima abertura | dia e hora em português no fuso `America/Sao_Paulo` |
| Dia atual | instante UTC que ainda pertence ao domingo em São Paulo |

Implementação: `lib/menu/presentation.ts` e `lib/menu/presentation.test.ts`. O respeito a `prefers-reduced-motion`, o card inteiro como link, o chip ativo e o carrossel manual ficam nos testes de navegador porque dependem de DOM e APIs do browser.

## Melhorias de UX (2026-10-12)

| Unitário | Casos |
| --- | --- |
| Carrossel | offset real e índice mais próximo com 1, 4 e 5 destaques; timer não reinicia no mesmo índice |
| Ordenação | disponíveis antes dos indisponíveis, `sort_order` e estabilidade preservados |
| Busca | nome/descrição continuam válidos e nome da categoria também encontra o produto |
| Status no cliente | instante anterior e exato do fechamento; fechamento manual durante o horário |

- Nº 2: atravessar abertura/fechamento com relógio simulado e conferir cabeçalho, cartão e “· hoje” sem recarregar.
- Nº 3: abrir produto de Início/Cardápio/Busca, voltar pelos dois botões e conferir rota, `?q=` e scroll; acesso externo cai em `/cardapio`.
- Nº 8: em 360×640 e 390×844, validar banner sem corte/salto, controles sem sobreposição e preço na primeira tela curta.
- Nº 10: validar relacionados no detalhe, indisponíveis no fim das faixas e busca por categoria.

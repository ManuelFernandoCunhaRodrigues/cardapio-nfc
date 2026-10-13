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

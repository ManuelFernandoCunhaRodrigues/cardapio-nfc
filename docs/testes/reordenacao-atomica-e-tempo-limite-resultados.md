# Reordenação atômica e tempo limite das leituras públicas — resultados

Data: 2026-10-13 · Ambiente: desenvolvimento + banco do stage (`csirmtmerqpbhatruzaf`)

## O que mudou

1. **Reordenação.** Mover um produto, uma categoria ou um destaque gravava duas alterações separadas; se uma falhasse, dois itens ficavam com a mesma posição. Agora a troca é uma função do banco (`swap_product_sort_orders`, `swap_category_sort_orders`, `swap_highlight_sort_orders`, migration `20261013151000_atomic_sort_order_swap`) que troca as duas posições em uma única instrução. A falha passou a ser registrada no log do servidor.
2. **Tempo limite.** As leituras públicas do Supabase (`lib/supabase/public.ts`) são abortadas depois de 10 segundos, contando cabeçalhos e corpo da resposta. Antes, uma lentidão do banco travava a geração de `/`, `/cardapio` e `/busca` até estourar os 60 segundos do build.

## Testes cruzados

| Teste | Quem propôs | Quem validou a ideia | Resultado |
| --- | --- | --- | --- |
| Unitários do tempo limite (`lib/supabase/public.test.ts`): aborta no limite, resposta rápida lê o corpo, respeita o `signal` externo, aborta corpo que não termina | Codex (o último caso a pedido do Claude) | Claude | 4 de 4 |
| Banco e RLS (`supabase/tests/sort_order_swap.sql`), 19 verificações | Claude | Codex (sugeriu as recusas de categoria e destaque, incluídas) | 19 de 19 |
| Funções expostas pela API do stage, com os nomes de parâmetro usados pelas actions | Claude | — | passou |

### Banco e RLS (stage)

| Quem chama | Caso | Esperado | Veio |
| --- | --- | --- | --- |
| Visitante | trocar produtos, categorias, destaques | `42501` (sem permissão de executar) | `42501` nos três |
| Autenticado sem perfil | trocar produtos, categorias, destaques | `P0001`, nada muda | `P0001` nos três; ordem `10,20,30` |
| Administrador | produtos de categorias diferentes | `P0001`, nada muda | `P0001` |
| Administrador | id inexistente (produto, categoria, destaque) | `P0001`, sem meia troca | `P0001` nos três |
| Administrador | o mesmo id duas vezes | `P0001` | `P0001` |
| Administrador | ordem depois das recusas | `10,20,30` | `10,20,30` |
| Administrador | trocar produtos, categorias, destaques | troca feita | ordem `20,10,30`; `9002,9001`; `9002,9001` |

O teste roda dentro de uma transação desfeita no fim; conferido depois: nenhum registro de teste ficou no stage (11 produtos, como antes).

### API do stage

`POST /rest/v1/rpc/swap_*_sort_orders` com a chave pública: `401` e `permission denied for function` nas três funções — existem, aceitam `p_source_id` e `p_neighbor_id` e recusam visitante. Com um parâmetro errado: `404 PGRST202`.

### Verificações do repositório

`npm run lint`, `npm run typecheck`, `npm test` (33 arquivos, 169 testes) e `npm run build`: todos passaram.

## Não testado

- **Reordenar pelo painel no navegador.** Exige o login do responsável. A ação chama a mesma função testada acima; fica para a conferência no stage.
- **Duas reordenações ao mesmo tempo.** A função trava as duas linhas antes de trocar, mas não houve teste com duas sessões simultâneas.
- **Lentidão real do Supabase.** O tempo limite foi testado com respostas simuladas, não com o banco lento de verdade.

## Produção

A migration `20261013151000_atomic_sort_order_swap` precisa ser aplicada em SALGAE-PRODUCTION **antes** de promover este código para a `main`. Sem ela, reordenar no painel de produção devolve "Não foi possível alterar a ordem agora"; o resto do sistema não é afetado.

**Feito em 2026-10-13**, com a autorização do responsável no chat:

1. Migration aplicada em SALGAE-PRODUCTION e conferida por leitura: as três funções existem, rodam com a permissão de quem chama, com `search_path` vazio, sem execução para `anon` e com execução para `authenticated`. O aviso de segurança do Supabase continua sendo só o de proteção contra senha vazada, que já existia.
2. `develop` promovida para a `main` (PR #38). `main` e `develop` ficaram sem diferença de arquivos.
3. Deploy de produção concluído e site conferido: `/`, `/cardapio`, `/busca`, `/info` e `/admin/login` respondem 200; `/admin` sem sessão leva ao login; a rota de envio de vídeo segue no ar.

Não testado em produção: reordenar pelo painel, que exige o login do responsável.

Pendência pequena: no banco de produção a migration ficou registrada com a versão `20261013214047`, diferente da do repositório (o mesmo já tinha acontecido com a de vídeo). Só importa se alguém usar `supabase db push`; a migration pode ser rodada de novo sem efeito.

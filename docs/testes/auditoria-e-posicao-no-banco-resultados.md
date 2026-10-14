# Auditoria e posição de item novo no banco — resultados

Data: 2026-10-14 · Ambiente: GitHub Actions, Supabase local criado do zero (job "banco local e ponta a ponta")

## O que mudou

1. **Auditoria.** Gatilhos `AFTER INSERT/UPDATE/DELETE` em `categories`, `products`, `highlights` e `store_settings` gravam em `audit_logs` na mesma transação da mudança. `create` guarda a linha nova, `update` só as colunas que mudaram (`{"coluna": {"de": …, "para": …}}`) e `delete` a linha removida. Um `update` que não muda nada além de `updated_at` não gera registro.
2. **Histórico só pelo banco.** `insert` em `audit_logs` foi revogado de `authenticated` e a política "admin insere auditoria" foi removida. O administrador continua lendo o histórico.
3. **Posição.** Gatilho `BEFORE INSERT` põe o item novo no fim do escopo (categoria do produto; tabela inteira para categorias e destaques), sob `pg_advisory_xact_lock`. O valor de `sort_order` enviado no insert é ignorado.
4. **Aplicação.** Saíram as funções `audit` de cinco arquivos de ações, os inserts diretos da loja e da rota de vídeo e a leitura do maior `sort_order` antes de criar. Erro de formulário e revalidação do catálogo vêm de `lib/admin/action-helpers.ts`.

## Testes cruzados

| Teste | Quem propôs | Quem validou a ideia | Resultado |
| --- | --- | --- | --- |
| `audit_and_sort_order.sql` (novo) | Codex | Claude | 15 de 15 |
| `rls_regression.sql`: administrador não grava auditoria direto (`42501`) | Codex | Claude | 38 de 38 |
| `rls_mutation_check.sql` | já existia | — | mutação detectada |
| `sort_order_swap.sql`, agora com posições relativas | Codex | Claude | passou |
| `video_storage_rls.sql` | já existia | — | passou |
| Vitest (ações de mídia, rota de vídeo, criação sem `sort_order`) | Codex | Claude | 183 de 183 |
| Ponta a ponta: criar, reordenar e marcar em falta pelo painel | Claude | Codex | 12 de 12 |

O teste novo confere a linha de auditoria de criação, alteração de preço e exclusão de categoria, produto e destaque; a alteração dos dados da loja; que um update sem mudança não gera linha; que administrador, usuário comum e visitante não gravam nem leem o que não devem; e que produto, categoria e destaque novos entram no fim mesmo quando o insert manda `sort_order = 0`.

## Defeito encontrado no caminho

A primeira versão da migration chamava `pg_catalog.coalesce(...)`. `coalesce` é uma construção da linguagem SQL, não uma função do catálogo, e a migration falhou no banco vazio do CI. Corrigida antes do merge; é o tipo de erro que o job de banco local existe para pegar.

## Mudanças de comportamento

- O seed não informa mais `sort_order`: as categorias entram na ordem do arquivo.
- O histórico perde os eventos com nome próprio (`reorder`, `media_image_remove`, números da compactação de vídeo). Uma reordenação aparece como dois `update` de `sort_order`, um por item.

## Não testado

- Duas criações realmente simultâneas. A trava está no gatilho, mas o teste roda numa sessão só.
- A migration no stage e em produção: entra no stage depois do merge; em produção, só com autorização.

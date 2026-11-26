---
titulo: "Modelo de dados e Supabase"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-11-16
---
# Modelo de dados e Supabase

Voltar: [[00-Comece-Aqui]] · Segurança: [[12-Seguranca-e-Qualidade]]

## Tabelas

Conferido em 2026-11-16 contra `packages/core/src/database/database.types.ts` e `supabase/migrations/`. Todas as tabelas têm `created_at` e `updated_at`, menos `audit_logs` (só `created_at`) e `store_settings` (só `updated_at`).

| Tabela | Campos | Observações |
| --- | --- | --- |
| `categories` | `id`, `name`, `slug`, `description`, `image_path`, `sort_order`, `is_active` | Organiza a leitura do cardápio. `slug` é único e vira a âncora `/cardapio#<slug>`. `image_path` é a foto do círculo na tela inicial (PR #81), guardada no bucket `product-images`, na pasta `categories/`. Categoria escondida esconde também os produtos dela. |
| `products` | `id`, `category_id`, `name`, `slug`, `description`, `price_cents`, `image_path`, `video_path`, `badge`, `sort_order`, `is_active`, `is_available` | `category_id` é obrigatório e aponta para `categories`. Preço em centavos inteiros (`price_cents >= 0`; o core limita a R$ 99.999,99). `slug` é único na tabela inteira, gerado do nome na criação, sem acentos e com `-2`, `-3` em caso de repetição; renomear não muda o endereço (migration `20261014150000_product_slug`). `video_path` só existe com `image_path`. `badge` é opcional: `mais_pedido`, `novo` ou `quentinho` no banco, mostrados como `MAIS PEDIDO`, `NOVO` e `QUENTINHO` ([[19-Referencia-Layout-Cardapio]]). A situação do painel sai de `is_active` e `is_available`: No cardápio (`true`/`true`), Em falta hoje (`true`/`false`) e Escondido (`is_active = false`). |
| `highlights` | `id`, `title`, `description`, `image_path`, `target`, `sort_order`, `is_active` | Banners do carrossel. `target` é o destino escolhido no painel: o cardápio inteiro, `/cardapio#<categoria>`, um produto ou outro endereço. O destino de produto ainda é gravado como `/produto/<id>`, e o site redireciona para o endereço com o nome (WEB-07 da revisão, pendente). |
| `profiles` | `id`, `name`, `role`, `is_active` | Complementa a identidade do Supabase Auth. |
| `audit_logs` | `id`, `actor_id`, `action`, `entity`, `entity_id`, `metadata`, `created_at` | Rastreia alterações do painel. Desde 2026-10-14 é preenchida só por gatilhos do banco, na mesma transação da mudança: `create` guarda a linha nova, `update` só as colunas que mudaram (`de`/`para`), `delete` a linha removida. Ninguém grava nela direto, nem o administrador. |
| `store_settings` | `id` (linha única), `name`, `tagline`, `address`, `maps_url`, `phone`, `whatsapp`, `instagram`, `opening_hours`, `status_override`, `notice` | Dados da loja para a aba **Info** e o status aberta/fechada. `opening_hours` guarda os 7 dias; `status_override` (`auto`, `open`, `closed`) permite abrir ou fechar manualmente. Leitura pública, edição só admin. |

## Regras de integridade

- Valor monetário deve ser salvo em formato sem ambiguidade: inteiro em centavos ou `numeric` com precisão definida; não usar `float`.
- `slug` é único na tabela inteira, tanto em `categories` quanto em `products`.
- `sort_order` precisa ter padrão previsível para evitar itens em ordem aleatória. Item novo sempre entra no fim (gatilho com trava por escopo: categoria do produto, ou a tabela inteira para categorias e destaques); a posição só muda pelas funções de troca.
- Produto que troca de categoria vai para o fim da categoria nova, com a mesma trava (migration `20261115120000_product_sort_order_on_category_change`, PR #92). Antes ele mantinha a posição antiga, que podia repetir a de outro produto, e subir/descer respondia sucesso sem mover nada. A migration também corrigiu as posições repetidas que já existiam.
- Trocar dois itens de posição é uma operação só no banco: as funções `swap_product_sort_orders`, `swap_category_sort_orders` e `swap_highlight_sort_orders` (migration `20261013151000_atomic_sort_order_swap`) trocam os dois `sort_order` em uma única instrução, ou não trocam nenhum. Rodam com a permissão de quem chama, então o RLS continua decidindo: só administrador ativo consegue. Produtos só trocam dentro da mesma categoria. Em produção desde 2026-10-13.
- O código conhece o esquema pelos tipos gerados do Supabase (`packages/core/src/database/database.types.ts`, desde 2026-10-13): tabela, coluna ou função com nome errado deixa de compilar. O arquivo é gerado, não editado à mão, e precisa ser gerado de novo a cada migration. O CI confere se ele bate com um banco criado do zero pelas migrations.
- A categoria de um produto não pode ser removida enquanto houver produtos vinculados: a API responde com erro e o painel pede para mover os produtos ou esconder a categoria.
- Uma imagem ou vídeo só deve ser apagado quando nenhum registro ainda o referenciar.
- Produto com `video_path` precisa ter `image_path`, usada como capa do vídeo e fallback.
- Conteúdo público considera, no mínimo, `is_active = true`; a regra de `is_available` segue [[04-Experiencia-do-Cliente]].

## Acesso e RLS

O Row Level Security deve ficar ativo em tabelas expostas. A política esperada é:

| Origem | Pode ler | Pode alterar |
| --- | --- | --- |
| Visitante público | Apenas categorias, produtos e destaques ativos permitidos. | Nada. |
| Usuário autenticado sem papel | Nada além de seu próprio perfil, se necessário. | Seu próprio perfil, conforme regra. |
| Administrador | Conteúdo administrativo autorizado. | Conteúdo administrativo autorizado. |

As permissões devem ser verificadas no banco. Esconder botões no frontend melhora a interface, mas não é controle de acesso.

## Migrações e dados de teste

Toda mudança de esquema deve entrar como migration versionada no repositório. Homologação recebe migrations antes de produção. Dados de teste pertencem somente ao Supabase de homologação; não copiar informações sensíveis da produção para ele.

| Migration | O que faz |
| --- | --- |
| `20261008222757_initial_schema` | Categorias, produtos, destaques, perfis e auditoria, com RLS. |
| `20261008225427_harden_rls` | `is_admin()` em esquema privado e uma política por papel e ação. |
| `20261008232020_store_settings` | Dados únicos da loja: horários, contatos e aviso. |
| `20261009103822_product_badge` | Selos do produto. |
| `20261009121148_media_storage` | Buckets de imagens e vídeos e suas políticas. |
| `20261011003026_video_compression_storage` | Bucket privado do vídeo bruto e limite de 4 MB no publicado. |
| `20261013151000_atomic_sort_order_swap` | Funções de troca de posição em uma única instrução. |
| `20261014120000_audit_and_sort_order_triggers` | Auditoria por gatilho e item novo no fim da lista. |
| `20261014150000_product_slug` | Endereço do produto pelo nome. |
| `20261115120000_product_sort_order_on_category_change` | Produto que troca de categoria vai para o fim da categoria nova. |

Em 2026-11-15, a última migration estava aplicada só no stage. A aplicação na produção e os segredos do workflow Migrations estão em [[09-Ambientes-e-Deploy]].

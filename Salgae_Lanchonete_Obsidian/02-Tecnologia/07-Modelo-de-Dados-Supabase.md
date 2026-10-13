---
titulo: "Modelo de dados e Supabase"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-10-08
---
# Modelo de dados e Supabase

Voltar: [[00-Comece-Aqui]] · Segurança: [[12-Seguranca-e-Qualidade]]

## Entidades iniciais

| Entidade | Campos essenciais | Observações |
| --- | --- | --- |
| `categories` | `id`, `name`, `slug`, `sort_order`, `is_active` | Organiza a leitura do cardápio. |
| `products` | `id`, `category_id`, `name`, `description`, `price`, `image_path`, `video_path`, `badge`, `sort_order`, `is_active`, `is_available` | Um produto deve referenciar uma categoria válida. `video_path` é opcional. `badge` é opcional: `MAIS PEDIDO`, `NOVO` ou `QUENTINHO` ([[19-Referencia-Layout-Cardapio]]). |
| `highlights` | `id`, `title`, `description`, `image_path`, `target`, `sort_order`, `is_active` | Controla conteúdo promocional no topo. |
| `profiles` | `id`, `name`, `role`, `is_active` | Complementa a identidade do Supabase Auth. |
| `audit_logs` (recomendado) | `id`, `actor_id`, `action`, `entity`, `entity_id`, `metadata`, `created_at` | Permite rastrear alterações administrativas relevantes. |
| `store_settings` | `id` (linha única), `name`, `tagline`, `address`, `maps_url`, `phone`, `whatsapp`, `instagram`, `opening_hours`, `status_override`, `notice` | Dados da loja para a aba **Info** e o status aberta/fechada. `opening_hours` guarda os 7 dias; `status_override` (`auto`, `open`, `closed`) permite abrir ou fechar manualmente. Leitura pública, edição só admin. |

## Regras de integridade

- Valor monetário deve ser salvo em formato sem ambiguidade: inteiro em centavos ou `numeric` com precisão definida; não usar `float`.
- `slug` deve ser único por categoria quando ele fizer parte de URL.
- `sort_order` precisa ter padrão previsível para evitar itens em ordem aleatória.
- Trocar dois itens de posição é uma operação só no banco: as funções `swap_product_sort_orders`, `swap_category_sort_orders` e `swap_highlight_sort_orders` (migration `20261013151000_atomic_sort_order_swap`) trocam os dois `sort_order` em uma única instrução, ou não trocam nenhum. Rodam com a permissão de quem chama, então o RLS continua decidindo: só administrador ativo consegue. Produtos só trocam dentro da mesma categoria. Em produção desde 2026-10-13.
- A categoria de um produto não deve ser removida enquanto houver produtos vinculados, salvo em transação/migração segura.
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

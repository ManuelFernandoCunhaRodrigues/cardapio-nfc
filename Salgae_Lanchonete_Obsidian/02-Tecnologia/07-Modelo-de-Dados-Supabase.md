---
titulo: "Modelo de dados e Supabase"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-09-26
---
# Modelo de dados e Supabase

Voltar: [[00-Comece-Aqui]] · Segurança: [[12-Seguranca-e-Qualidade]]

## Entidades iniciais

| Entidade | Campos essenciais | Observações |
| --- | --- | --- |
| `categories` | `id`, `name`, `slug`, `sort_order`, `is_active` | Organiza a leitura do cardápio. |
| `products` | `id`, `category_id`, `name`, `description`, `price`, `image_path`, `sort_order`, `is_active`, `is_available` | Um produto deve referenciar uma categoria válida. |
| `highlights` | `id`, `title`, `description`, `image_path`, `target`, `sort_order`, `is_active` | Controla conteúdo promocional no topo. |
| `profiles` | `id`, `name`, `role`, `is_active` | Complementa a identidade do Supabase Auth. |
| `audit_logs` (recomendado) | `id`, `actor_id`, `action`, `entity`, `entity_id`, `metadata`, `created_at` | Permite rastrear alterações administrativas relevantes. |

## Regras de integridade

- Valor monetário deve ser salvo em formato sem ambiguidade: inteiro em centavos ou `numeric` com precisão definida; não usar `float`.
- `slug` deve ser único por categoria quando ele fizer parte de URL.
- `sort_order` precisa ter padrão previsível para evitar itens em ordem aleatória.
- A categoria de um produto não deve ser removida enquanto houver produtos vinculados, salvo em transação/migração segura.
- Uma imagem só deve ser apagada quando nenhum registro ainda a referenciar.
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

---
titulo: "Decisões do projeto"
area: Gestao
tags:
  - gestao
  - projeto
atualizado: 2026-09-26
---
# Decisões do projeto

Voltar: [[00-Comece-Aqui]]

Este arquivo guarda escolhas já feitas. Para cada nova decisão, acrescente data, contexto, decisão, motivo e consequência.

| Status | Decisão | Motivo e consequência |
| --- | --- | --- |
| Definida | O cardápio será para consumo local. | Delivery, carrinho e checkout ficaram fora do MVP. Ver [[02-Escopo-Atual]]. |
| Definida | Supabase/PostgreSQL será o banco de dados. | Centraliza dados, autenticação e armazenamento de arquivos sob regras de acesso. |
| Definida | Haverá dois ambientes separados. | Homologação não pode alterar ou expor os dados da produção. |
| Definida | `develop` alimenta homologação e `main` alimenta produção. | Permite validar mudanças antes de afetar clientes e operação. |
| Definida | Serão dois projetos Vercel, não apenas previews. | Cada ambiente terá vínculo explícito com sua branch e seu Supabase. |
| Definida | O projeto começa dedicado à Salgaê. | Evita complexidade prematura de multi-tenant. |
| Definida | Claude Code orquestra; Codex executa trabalho técnico pesado. | Reduz contexto repetido e dá um fluxo de execução rastreável. Ver [[11-Agentes-de-IA]]. |

## Modelo de registro para próximas decisões

### Título da decisão

- **Data:** AAAA-MM-DD
- **Contexto:** qual problema ou oportunidade motivou a conversa?
- **Decisão:** o que foi escolhido?
- **Por quê:** quais critérios pesaram?
- **Impacto:** quais documentos, dados ou partes do produto precisam mudar?
- **Revisão:** quando essa escolha deve ser reavaliada?

## Decisões pendentes relevantes

- Framework final do frontend (a base recomendada está em [[06-Arquitetura-e-Stack]]).
- Forma de contato do cliente com a equipe durante a visita.
- Política visual: identidade, cores, fotos, tamanhos e textos.
- Papéis de acesso do painel.
- Se haverá métricas anônimas desde a primeira versão.

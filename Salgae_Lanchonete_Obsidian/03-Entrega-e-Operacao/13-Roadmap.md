---
titulo: "Roadmap do projeto"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-11-16
---
# Roadmap do projeto

Voltar: [[00-Comece-Aqui]] · Detalhamento: [[14-Epicos-de-Desenvolvimento]]

O roadmap organiza a sequência de valor. A próxima fase só avança quando os critérios essenciais da anterior estiverem atendidos.

| Fase | Objetivo | Entrega observável | Status em 2026-11-16 |
| --- | --- | --- | --- |
| 0. Fundação | Confirmar escopo, identidade e ambientes. | Repositório, branches, Vercel e Supabase separados. | **Feito** (2026-10-08 a 10-10). |
| 1. Base técnica | Aplicação pronta para evoluir com segurança. | Rotas, configuração, design base, autenticação e migrations. | **Feito.** Depois reestruturada em `apps/web`, `apps/api` e `packages/core` (PRs #74 e #80). |
| 2. Catálogo público | Permitir que o cliente veja o cardápio. | Página responsiva com categorias, produtos e detalhes. | **Feito**, com o redesenho de outubro e os ajustes das ondas 1 e 4 (PRs #90 e #101). |
| 3. Gestão de conteúdo | Dar autonomia à equipe. | Painel de categorias, produtos, disponibilidade e destaques. | **Feito**, com foto da categoria (#81) e os ajustes do painel (#85, #89, #91). A onda 4 do painel está em andamento. |
| 4. Mídia e robustez | Garantir boa apresentação e armazenamento limpo. | Upload validado de fotos e vídeos curtos, otimização e troca/exclusão segura. | **Feito**: compactação de vídeo (2026-10-10), uploads seguros (#92) e vídeo pela API (#94). |
| 5. Homologação | Validar fluxo real com dados de teste. | Checklist aprovado no ambiente `develop`. | **Parcial**: checklist aprovado no stage em 2026-10-09 e E2E completo no CI; falta o teste em celular real (iPhone e Android). |
| 6. Pronto para demonstrar (antes "Lançamento") | Ter o sistema estável e convincente para mostrar a clientes. | Produção publicada e ativa, conteúdo de exemplo, QR testado e roteiro de demonstração. | **Parcial**: produção publicada desde 2026-10-10, QR verificado, roteiro em `docs/publicacao-producao.md`. Faltam o conteúdo de exemplo, o teste em celular real e a promoção da `develop` (onda 6). NFC gravado e equipe de loja **não se aplicam**. |
| 7. Evolução | Melhorar com uso real. | Métricas, melhorias de UX e módulos somente se justificados. | **Em andamento** como as ondas do plano de 2026-11-15 ([[27-Revisao-Geral-e-Plano-de-Acao]]). Métricas não foram feitas. |

> A Fase 6 foi reinterpretada em 2026-11-15: o sistema é uma demonstração para clientes, com hospedagem gratuita e sem domínio próprio ([[03-Decisoes-do-Projeto]]). "Colocar em uso no estabelecimento" só volta se um cliente real for usar o sistema.

## Prioridade do MVP

O MVP não precisa ser perfeito em quantidade de recursos. Ele precisa ser confiável no fluxo central: abrir o cardápio, entender o item e a equipe conseguir manter as informações corretas.

## Critério de avanço

Não promover uma fase por calendário apenas. Avançar quando o resultado for testável, compreendido pela operação e não introduzir risco inaceitável em produção.

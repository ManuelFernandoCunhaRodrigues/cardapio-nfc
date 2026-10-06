---
titulo: "Git e fluxo de entrega"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-09-26
---
# Git e fluxo de entrega

Voltar: [[00-Comece-Aqui]] · Ambientes: [[09-Ambientes-e-Deploy]]

## Branches permanentes

| Branch | Papel | Proteção desejada |
| --- | --- | --- |
| `main` | Código de produção. | Sem push direto; merge por Pull Request revisado. |
| `develop` | Integração e homologação. | Sem push direto quando possível; merge por Pull Request. |

## Branches de trabalho

Crie uma branch curta a partir de `develop` para cada objetivo claro:

```text
feat/cadastro-produtos
fix/ordenacao-categorias
chore/ajuste-variaveis-staging
docs/atualiza-roadmap
```

## Ciclo de uma funcionalidade

1. Confirmar objetivo e critérios de aceite no épico correspondente.
2. Criar branch com nome descritivo.
3. Implementar mudanças pequenas e coesas.
4. Executar lint, testes, typecheck e build aplicáveis.
5. Abrir PR para `develop` com resumo, telas/impactos e passos de teste.
6. Revisar e fazer merge após aprovação.
7. Validar no ambiente de homologação.
8. Incluir no PR de promoção para `main` quando estiver pronto.

## Convenção de commits

Use mensagens que expliquem a mudança, por exemplo:

```text
feat(products): adiciona controle de disponibilidade
fix(storage): preserva imagem anterior quando upload falha
docs(roadmap): define critérios do MVP
```

## Pull Request mínimo

Todo PR deve informar:

- o que muda e por quê;
- quais telas, tabelas ou variáveis são impactadas;
- como testar;
- riscos conhecidos e plano de rollback, se houver;
- evidência de lint/testes/build quando aplicável.

Não misturar grande refatoração, nova funcionalidade e ajuste visual sem necessidade. Mudanças menores são mais fáceis de revisar e reverter.

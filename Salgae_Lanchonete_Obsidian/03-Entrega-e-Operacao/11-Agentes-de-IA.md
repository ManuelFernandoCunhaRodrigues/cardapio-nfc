---
titulo: "Agentes de IA: Claude Code e Codex"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-10-10
---
# Agentes de IA: Claude Code e Codex

Voltar: [[00-Comece-Aqui]] · Fluxo de desenvolvimento: [[10-Git-e-Fluxo-de-Entrega]]

## Princípio de trabalho

O **Claude Code** atua como orquestrador enxuto. O **Codex**, usado dentro do fluxo de desenvolvimento, é o executor principal do trabalho de engenharia. A separação evita que ambos explorem o repositório inteiro ou repitam a mesma investigação.

## Responsabilidades

| Papel | Responsável | Faz | Evita |
| --- | --- | --- | --- |
| Orquestração | Claude Code | Entende pedido, define objetivo, quebra em tarefas, define critérios, pede resumos e aponta decisões que exigem validação. | Explorar amplamente o repositório ou repetir diagnósticos técnicos já delegados. |
| Execução técnica | Codex | Lê arquivos, rastreia dependências, implementa, depura, refatora, executa testes, lint, typecheck, build e revisão de segurança. | Fazer mudanças de produto ambíguas sem devolver opções e impactos. |
| Decisão de produto | Manuel/responsável | Define prioridade, experiência desejada, preço, operação e aceita trade-offs. | Aprovar mudança de escopo sem entender impacto. |

## Handoff ideal

Antes de delegar ao Codex, o Claude Code deve passar:

- objetivo específico;
- arquivo/área provável, quando conhecida;
- restrições de escopo;
- critérios de aceite;
- ambiente em que a mudança será validada.

Ao concluir, o Codex deve devolver um resumo curto com:

- arquivos alterados;
- comportamento implementado;
- comandos/verificações executados e resultado;
- riscos, limitações ou decisões pendentes;
- próximo passo recomendado.

## Rotina para uma tarefa

1. Consultar [[02-Escopo-Atual]], decisão relevante e épico.
2. Claude Code transforma o pedido em tarefa objetiva.
3. Codex investiga apenas o necessário e executa.
4. Codex valida localmente e produz handoff.
5. Claude Code confere se o resultado cumpre o objetivo e solicita decisão humana quando houver trade-off.
6. A mudança segue o PR e a homologação definidos em [[10-Git-e-Fluxo-de-Entrega]].

## Testes cruzados (obrigatório)

Toda entrega passa por testes validados pelos dois agentes:

1. **Validar a ideia antes de rodar:** o Codex propõe os testes dele (unitários e integração) e o Claude Code valida; o Claude Code propõe os dele (navegador, banco/RLS, ponta a ponta) e o Codex valida.
2. **Executar** os testes aprovados.
3. **Conferir o resultado** contra a ideia do projeto (este vault), não só se "passou".
4. **Corrigir e repetir** até tudo bater; só então PR e merge.

Subagentes extras apenas quando realmente necessário, para economizar tokens.

## Escolha do modelo do Codex

Regra definida pelo responsável em 2026-10-10: antes de delegar, o Claude Code avalia a complexidade da tarefa e escolhe o modelo e o esforço de raciocínio do Codex. **O único modelo proibido é o `gpt-6-astra`.** Qualquer outro oferecido pelo Codex pode ser usado.

| Complexidade | Exemplos | Modelo | Esforço |
| --- | --- | --- | --- |
| Simples | ajuste em um arquivo, texto, documentação, rodar lint/testes, pequenas correções | `gpt-6-luna` | `medium` |
| Média | funcionalidade em uma área, testes novos, validação de plano de testes, correção de bug localizado | `gpt-6.1-sol` | `medium` |
| Alta | várias áreas ao mesmo tempo, banco/RLS/migrations, segurança, mídia, depuração difícil | `gpt-6.1-sol` | `high` |
| Crítica | arquitetura, planejamento de mudança de escopo, revisão adversarial antes de produção | `gpt-6.1-sol` | `xhigh` |

- O modelo é passado explicitamente em cada tarefa (`--model` e `--effort`); não depender do padrão da máquina, que pode mudar.
- Na dúvida entre dois níveis, usar o mais alto: retrabalho custa mais que raciocínio.
- Se o modelo escolhido estiver indisponível, descer para `gpt-6-sol` e depois `gpt-5.6-terra`, nunca subir para o `gpt-6-astra`.
- O modelo e o esforço usados entram no registro dos testes de cada entrega.

## Revisões

Use revisão normal para funcionalidade e estilo. Antes de promover ao ambiente de produção, faça uma revisão adversarial focada em acesso indevido, dados públicos, imagens, variáveis e regressões do cardápio.

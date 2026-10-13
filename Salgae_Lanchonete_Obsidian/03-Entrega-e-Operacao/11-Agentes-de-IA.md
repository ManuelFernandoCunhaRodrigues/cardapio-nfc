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

Regra definida pelo responsável em 2026-10-10: antes de delegar, o Claude Code avalia a tarefa por **dois critérios — complexidade e economia de tokens** — e escolhe o modelo e o esforço de raciocínio do Codex. A meta é o nível mais econômico que resolve bem a tarefa. **O único modelo proibido é o `gpt-6-astra`.**

| Complexidade | Exemplos | Modelo | Esforço |
| --- | --- | --- | --- |
| Simples | ajuste em um arquivo, texto, documentação, rodar lint/testes, pequenas correções | `gpt-5.6-luna` | `low` |
| Média | funcionalidade em uma área, testes novos, validação de plano de testes, bug localizado | `gpt-5.6-terra` | `medium` |
| Alta | várias áreas ao mesmo tempo, banco/RLS/migrations, segurança, mídia, depuração difícil | `gpt-5.6-sol` | `medium` (subir para `high` se envolver RLS ou dados) |
| Crítica | arquitetura, planejamento de mudança de escopo, revisão adversarial antes de produção | `gpt-5.6-sol` | `high` (`xhigh` só quando um erro custa caro: segurança e produção) |

Como equilibrar os dois critérios:

- **Começar pelo degrau mais barato que dá conta.** Só subir um nível se o resultado vier incompleto ou errado — e registrar que subiu.
- **O esforço pesa tanto quanto o modelo.** Subir o esforço de um modelo menor costuma sair mais barato que trocar de modelo.
- **Economia também está no pedido:** escopo fechado, arquivos indicados, critério de aceite claro, continuar a mesma conversa do Codex em vez de abrir outra, e relatório final curto.
- **Não economizar onde o erro é caro:** permissões do banco, dados de produção e segurança ficam sempre em `gpt-5.6-sol`.
- **Modelos disponíveis:** a conta ChatGPT ligada ao Codex nesta máquina aceita `gpt-5.6-sol`, `gpt-5.6-terra` e `gpt-5.6-luna`. A família `gpt-6` é recusada pela conta (testado em 2026-10-10). Se a conta mudar, rever a tabela.
- O modelo e o esforço são passados explicitamente em cada tarefa (`--model` e `--effort`) e entram no registro dos testes da entrega.

## Revisões

Use revisão normal para funcionalidade e estilo. Antes de promover ao ambiente de produção, faça uma revisão adversarial focada em acesso indevido, dados públicos, imagens, variáveis e regressões do cardápio.

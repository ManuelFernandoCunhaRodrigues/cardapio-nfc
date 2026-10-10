---
titulo: "Ideia — pedido pela mesa"
area: Produto
tags:
  - produto
  - ideia
  - em-analise
atualizado: 2026-10-10
---
# Ideia — pedido pela mesa

Voltar: [[00-Comece-Aqui]] · Relacionado: [[02-Escopo-Atual]] · [[03-Decisoes-do-Projeto]]

> **Status: ideia em análise. Nada aqui está aprovado nem em desenvolvimento.**
> Hoje o produto é só de consulta ("Faça seu pedido com o atendente"). Carrinho e pedido estão fora do escopo em [[02-Escopo-Atual]]; esta ideia só entra com uma nova decisão do responsável.

## O que foi pedido (2026-10-10)

Registro da conversa com o responsável, nas palavras dele organizadas:

1. **Pedido direto da mesa, sem chamar o garçom.** O cliente escolhe os produtos no cardápio, confere o que escolheu e envia o pedido.
2. **Somente consumo no local.** Não é delivery, não tem entrega nem taxa.
3. **O pedido chega sozinho na cozinha.** Pode ser numa tela do sistema ou num papel impresso automaticamente (a comanda / ticket de cozinha — não é nota fiscal).
4. **Cada pedido precisa saber de qual mesa veio.** Considerar número das mesas.
5. **Links personalizados por mesa**, cada um com um identificador próprio.
6. **Acesso ao cardápio só dentro do restaurante.** Quem está fora não deveria conseguir acessar.
7. **O projeto será entregue a outra pessoa, que vai rodá-lo em uma VPS Ubuntu.** É preciso explicar como o banco está organizado hoje no Supabase e qual a melhor forma de reproduzir (ou melhorar) essa organização na VPS.

## Como isso será tratado

1. Claude Code e Codex planejam juntos, em segundo plano, a melhor forma de executar.
2. O planejamento é apresentado ao responsável como **explicação da ideia**, com alternativas e riscos.
3. O responsável conversa, ajusta e decide se é viável.
4. Com o "ok" dele, a ideia é detalhada **neste arquivo Markdown** e só ele é atualizado no GitHub. **Não vira código nem pacote de desenvolvimento nesta etapa.**

## Perguntas em aberto

- A cozinha vai usar tela, impressora térmica ou os dois? Já existe impressora? Qual modelo?
- O pagamento continua no caixa, como hoje?
- O cliente pode fazer vários pedidos na mesma visita (conta aberta por mesa)?
- Alguém da equipe confirma o pedido antes de ir para a cozinha, ou vai direto?
- "Só dentro do restaurante" vale para **ver** o cardápio ou só para **pedir**?
- Quantas mesas existem e como são identificadas hoje?

## Proposta

_A preencher depois do planejamento e da validação do responsável._

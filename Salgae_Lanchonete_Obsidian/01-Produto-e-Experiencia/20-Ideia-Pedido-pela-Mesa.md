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

## Complementos do responsável (2026-10-10, conversa de validação)

Depois de ouvir a primeira explicação da ideia, o responsável acrescentou:

1. **Cada mesa terá um cartão NFC e um QR Code.** Os dois ficam na mesa e levam ao cardápio daquela mesa.
2. **Quem aceita o primeiro pedido da mesa é o atendente.**
3. **Cada mesa tem um ID de identificação.** No tablet ou no telão aparece "Mesa 5", "Mesa 6", e o sistema reconhece sozinho de qual mesa veio o pedido.
4. **O caixa pode ser um sistema que já existe no restaurante.** Não se sabe ainda se o estabelecimento terá sistema de caixa próprio. Muitos restaurantes já usam um, fechado e sem API aberta, e não vão querer trocar. A ideia precisa funcionar nesses casos.
5. **O nosso sistema guarda o preço do que foi pedido.** Para fazer a ponte com o caixa, pensar em algo que possa ser impresso (um papel com o que a mesa consumiu).

Os pontos 4 e 5 estão sendo planejados por Claude Code e Codex (rodada 3), junto com o detalhe do NFC.

## Como isso será tratado

1. Claude Code e Codex planejam juntos, em segundo plano, a melhor forma de executar.
2. O planejamento é apresentado ao responsável como **explicação da ideia**, com alternativas e riscos.
3. O responsável conversa, ajusta e decide se é viável.
4. Com o "ok" dele, a ideia é detalhada **neste arquivo Markdown** e só ele é atualizado no GitHub. **Não vira código nem pacote de desenvolvimento nesta etapa.**

## Perguntas em aberto

- A cozinha vai usar tela, impressora térmica ou os dois? Já existe impressora? Qual modelo?
- O restaurante já tem sistema de caixa? Qual? Ele aceita importar pedidos ou só digitação?
- O papel com o consumo da mesa é impresso no caixa, com o atendente, ou nos dois?
- O cliente pode fazer vários pedidos na mesma visita (conta aberta por mesa)?
- "Só dentro do restaurante" vale para **ver** o cardápio ou só para **pedir**?
- Quantas mesas existem e como são identificadas hoje?

Respondidas em 2026-10-10:

- ~~Alguém da equipe confirma o pedido antes de ir para a cozinha, ou vai direto?~~ O atendente aceita o primeiro pedido da mesa.
- ~~O pagamento continua no caixa, como hoje?~~ Sim, fora do nosso sistema; o caixa pode ser um sistema próprio do restaurante.

## Proposta

_A preencher depois do planejamento e da validação do responsável._

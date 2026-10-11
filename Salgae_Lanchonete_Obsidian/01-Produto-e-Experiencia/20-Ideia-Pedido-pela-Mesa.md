---
titulo: "Ideia — pedido pela mesa"
area: Produto
tags:
  - produto
  - ideia
  - planejamento
atualizado: 2026-10-10
---
# Ideia — pedido pela mesa

Voltar: [[00-Comece-Aqui]] · Relacionado: [[02-Escopo-Atual]] · [[03-Decisoes-do-Projeto]]

> **Status: ideia registrada no planejamento. Não está aprovada para desenvolvimento.**
> Ela só entra em desenvolvimento quando o responsável disser, de forma explícita, que quer desenvolver esta ideia. Até lá o produto continua no básico: cardápio de consulta ("Faça seu pedido com o atendente"). Carrinho e pedido seguem fora do escopo em [[02-Escopo-Atual]].
>
> Este registro existe para a ideia poder ser entregue a outra pessoa que vá desenvolvê-la.

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

6. **A impressão por mesa fica para depois.** Depois de ver o plano do caixa, ele decidiu adiar a parte de imprimir o consumo de acordo com o número da mesa.
7. **A ideia fica só registrada.** O produto será apresentado a empresas menores, que querem só o básico. Esta ideia não entra em desenvolvimento agora e pode ser entregue a outra pessoa para desenvolver.

## Como isso foi tratado

1. Claude Code e Codex planejaram juntos, em três rodadas.
2. O planejamento foi apresentado ao responsável como explicação da ideia, com alternativas e riscos.
3. O responsável conversou, ajustou e pediu para **só registrar**: a ideia não vai para desenvolvimento agora.
4. No fim de todas as ideias, ele dirá quais podem ser desenvolvidas e quais ficam só no planejamento.

## Perguntas em aberto

- Quantas mesas existem e que nomes aparecem (Mesa 1, Varanda 1, balcão)?
- O cardápio abre só pelo NFC/QR da mesa, ou continua público e só o pedido é protegido?
- O cliente pode juntar mesas ou trocar de mesa? Quem autoriza?
- Ao pedir a conta, a mesa trava para novos pedidos até o atendente reabrir?
- Em quantos minutos expira um primeiro pedido que ninguém aceitou?
- Quem pode cancelar um pedido, e até que momento?
- A cozinha vai usar tela, impressora térmica ou os dois? Já existe impressora? Qual modelo?
- O restaurante já tem sistema de caixa? Qual? Ele aceita importar pedidos ou só digitação?
- Quando o preço do cardápio for diferente do preço no caixa, qual vale?
- Na VPS, o banco fica dentro dela ou continua no Supabase na nuvem?

Respondidas em 2026-10-10:

- Alguém da equipe confirma o pedido antes de ir para a cozinha? **O atendente aceita o primeiro pedido da mesa.**
- O pagamento continua no caixa? **Sim, fora do nosso sistema; o caixa pode ser um sistema próprio do restaurante.**

## Planejamento registrado (2026-10-10)

> Resultado das três rodadas entre Claude Code e Codex e da conversa com o responsável. É um plano, não uma especificação aprovada. Onde está escrito **incerto**, falta teste ou resposta.

### Como funciona

1. Cada mesa tem um **cartão NFC e um QR Code**. Os dois abrem o mesmo link, que é o cardápio daquela mesa.
2. O cliente escolhe os itens, revisa e envia.
3. O **primeiro pedido da mesa** fica aguardando. O atendente vê "Mesa 5 — primeiro pedido — confirmar ocupação" no tablet, olha a mesa e aceita ou recusa.
4. Aceito o primeiro, os pedidos seguintes da mesma mesa vão direto para a cozinha. A mesa fica aberta, como uma conta.
5. A cozinha acompanha numa tela (tablet ou computador): mesa, número do pedido, itens, quantidades, observação e horário. A equipe marca "em preparo", "pronto" e "entregue".
6. Ao fechar, o caixa abre a mesa no painel e vê tudo o que foi pedido, com preço e total. Cobra no sistema ou no processo que o restaurante já usa. Depois confirma no painel que a mesa foi fechada.

O preço e a disponibilidade são conferidos no servidor no momento do envio. Se um item esgotou, o pedido volta para o cliente ajustar. Clique repetido não gera pedido duplicado.

### Identificação da mesa

Cada mesa tem três coisas separadas:

- **ID interno**, que nunca muda e que o cliente não escolhe.
- **Nome** que aparece no tablet, no telão e na conta ("Mesa 5").
- **Código do link**, longo e aleatório, gravado no NFC e no QR.

Assim dá para renomear uma mesa ou trocar o cartão sem perder o histórico. O nome da mesa é o maior elemento do cartão na tela da cozinha.

O código do link fica fixo. Ele só é trocado (regravar o NFC e reimprimir o QR) se alguém abusar daquela mesa ou se o cartão for substituído. Travar o cartão NFC contra regravação é recomendado, para ninguém trocar o endereço por um link falso; como a trava pode ser irreversível, só depois de testar o link.

**Incerto:** a leitura do NFC varia por aparelho. Testar em celulares reais; o QR é a alternativa que funciona em todos.

### "Só dentro do restaurante"

Nenhuma tecnologia de navegador prova que a pessoa está no salão. O plano é dificultar:

- O link da mesa não é adivinhável.
- O **aceite do atendente** no primeiro pedido é a barreira real contra quem fotografou o QR e tenta pedir de fora.
- A mesa aberta tem prazo e é fechada no caixa.
- Há limite de tentativas e de itens por pedido.

GPS e bloqueio pelo Wi-Fi não são recomendados: barram cliente legítimo (quem está no 4G, quem nega a localização) e continuam burláveis.

Fica em aberto se o cardápio só abre pelo link da mesa ou se continua público e só o pedido é protegido.

### Caixa

O Salgaê não é sistema de caixa nem emite nota fiscal. Ele mostra o **consumo da mesa** e o caixa cobra no processo do restaurante.

| Situação do restaurante | O que o Salgaê entrega |
| --- | --- |
| Não tem sistema de caixa | O consumo da mesa na tela serve como conta. Recebimento e nota fiscal continuam fora do sistema. |
| Tem sistema fechado, sem API | O consumo da mesa na tela; o operador digita os itens no sistema dele. É o caso-base do plano. |
| Tem sistema com API ou importação | O mesmo agora; uma integração específica para aquele sistema pode vir depois. |

Para acelerar a digitação, cada produto pode ter um campo opcional **"código no caixa"**, com o código que o item tem no sistema do restaurante.

Não existe forma confiável de lançar o pedido sozinho num sistema de caixa fechado. Automação que "digita sozinha" no caixa é frágil e pode lançar valor errado; ficou fora do plano.

O preço fica guardado em dois lugares (cardápio do Salgaê e caixa do restaurante) e alguém precisa manter os dois iguais. O preço que o cliente viu ao pedir fica congelado no pedido.

### Deixado para depois (decisão do responsável, 2026-10-10)

**Impressão por mesa.** O papel com o consumo da mesa, para levar ao caixa, foi planejado mas adiado. Fica registrado o que se sabe:

- Seria uma "conferência de consumo" (pré-conta) com o aviso "NÃO É DOCUMENTO FISCAL".
- Impressão por clique funciona em computador com a impressora térmica instalada. Em tablet ou celular depende do modelo (**incerto**).
- Conferência parcial (mesa aberta) e de fechamento são diferentes; reimpressão sai como "2ª via".
- O layout do papel precisa ser validado com o contador do restaurante. Nenhuma norma fiscal foi verificada.

Também ficam para depois: comanda impressa automaticamente na cozinha (exige um programa rodando num computador dentro do restaurante), integração direta com sistema de caixa, juntar mesas e trocar o cliente de mesa.

### Papéis

- **Administrador:** configura cardápio, mesas, links e usuários.
- **Atendente:** aceita o primeiro pedido da mesa, acompanha as mesas e fecha a conta.
- **Cozinha:** vê a fila e muda o estado dos pedidos.

O cliente não tem login. A relação com o papel "operador" está em [[21-Ideia-Usuarios-e-Rastreabilidade]].

### Notas técnicas para quem for desenvolver

- O visitante nunca escreve direto no banco. O pedido entra por um ponto único no servidor, que valida o link da mesa, aplica o limite de tentativas e grava tudo numa transação.
- O navegador nunca informa preço, total, estado nem mesa. O servidor copia nome, preço e código do caixa do produto para o item do pedido.
- Cada envio leva uma chave de idempotência; a mesma chave devolve o pedido já criado.
- O banco guarda só o hash do código do link, nunca o código.
- Estados da mesa: aguardando aceite → aberta → fechando → fechada (além de recusada e expirada).
- Estados do pedido: aguardando aceite → novo → em preparo → pronto → entregue (além de cancelado e recusado). Estado final não volta atrás; correção é um novo registro.
- Toda mudança de estado guarda quem fez e quando.
- Tabelas novas previstas: mesas, sessões de mesa, pedidos, itens do pedido e histórico de estados. Em `products`, o campo opcional do código no caixa.
- A tela da cozinha pode começar consultando a fila a cada poucos segundos; atualização em tempo real é melhoria posterior.
- Hoje o projeto só tem o papel `admin`, não usa tempo real e não tem nenhuma tabela de mesa ou pedido.

### Entrega em VPS Ubuntu

O banco hoje está no Supabase na nuvem: Postgres com as tabelas do cardápio, regras de acesso por linha (RLS), login por e-mail e senha, e três pastas de arquivos (fotos de produto, fotos de destaque e vídeos).

Dois caminhos:

| Caminho | Vantagem | Custo |
| --- | --- | --- |
| **Supabase auto-hospedado na VPS** (Docker), com o site junto | Banco, login e arquivos funcionam como hoje, com quase nenhuma mudança no código. Os dados ficam na VPS. | Quem recebe o projeto cuida de backup do banco **e** dos arquivos, atualizações, certificado, firewall e monitoramento. A VPS vira ponto único de falha. |
| **Só o site na VPS**, banco no Supabase na nuvem | Menos manutenção; backup gerenciado. | Continua dependendo do Supabase e do custo dele. |

Reescrever login, arquivos e API em cima de um Postgres puro não é recomendado: é a maior reescrita e não traz ganho para este produto.

Tamanho de partida para o Supabase auto-hospedado: 2 vCPU, 4 GB de RAM e 40 GB de disco é o piso apertado; 4 vCPU, 8 GB e 80 GB dá margem. **Incerto** sem medir o uso real.

### Ordem sugerida, se um dia for desenvolvida

1. Fechar as perguntas em aberto.
2. Mesas, links por mesa e papéis de atendente e cozinha.
3. Carrinho e envio do pedido.
4. Tela da cozinha, tela do atendente e fechamento da mesa.
5. Piloto no salão com mesas reais.
6. Só depois: impressão, integração com caixa e tempo real.

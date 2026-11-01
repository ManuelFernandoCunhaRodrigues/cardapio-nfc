# Rodada 3 — caixa, impressão, NFC e identificação da mesa

**Data da resposta analisada:** 2026-10-10  
**Status:** planejamento; não autoriza implementação.  
**Legenda:** **FATO NO REPOSITÓRIO** identifica o que foi conferido nos arquivos locais. **INCERTO** identifica o que depende de teste, fornecedor, contador ou orientação jurídica.

## M1 — Conferência da mesa, não caixa fiscal

**Veredito: ACEITO.** O limite precisa aparecer no produto e no papel: o Salgaê organiza pedidos e emite uma **conferência de consumo/pré-conta**; não autoriza pagamento, não emite documento fiscal e não substitui o PDV.

- A conferência deve trazer loja, mesa, sessão/conta, pedidos incluídos, itens, quantidade, preço unitário, total, horários e número interno da conferência.
- Só entram pedidos aceitos e não cancelados. Cancelados podem aparecer em bloco separado, sem compor o total.
- Deve constar, em destaque, **“NÃO É DOCUMENTO FISCAL — confira antes do pagamento”**.
- O operador lança e cobra no processo de caixa adotado pelo estabelecimento. Emissão fiscal continua no sistema ou procedimento fiscal próprio.
- No cenário sem PDV, o Salgaê ainda não vira caixa: será necessário definir fora dele como pagamento, fechamento financeiro e emissão fiscal serão feitos.

## M2 — Impressão manual pelo navegador

**Veredito: ACEITO EM PARTE.** É uma boa primeira versão para a pré-conta, mas “impressora instalada como impressora comum no tablet” não é uma premissa universal.

- Em computador Windows/Linux com driver e impressora térmica instalada, botão **Imprimir** + `window.print()` + layout próprio para 58/80 mm é uma solução simples. O diálogo do sistema continua aparecendo; não é impressão silenciosa.
- Em Android/iPhone/iPad, impressão, corte, largura e margens variam conforme sistema, fabricante e aplicativo da impressora. **INCERTO até testar o modelo real.** Para o piloto, preferir o computador do caixa ou homologar antes a combinação tablet/impressora.
- Manter dois layouts, 58 e 80 mm, com seleção por loja; impressão de teste deve validar acentos, quebra de linhas, margens e corte.
- Sem agente local na primeira versão. Impressão automática de comanda da cozinha é outro problema e continua posterior ao piloto.
- Falha ao imprimir não altera pedido nem conta. O operador pode tentar de novo, e a reimpressão fica registrada.

## M3 — Código do produto no caixa e códigos impressos

**Veredito: ACEITO EM PARTE.** Vale incluir um campo textual opcional **“código no caixa/PLU”**, preservando zeros à esquerda, mas ele só ajuda se o estabelecimento mantiver a correspondência com o PDV.

- Gravar também o código em snapshot no item do pedido; uma alteração futura no produto não pode mudar conferências antigas.
- Padrão inicial: imprimir o PLU em texto ao lado do item. É legível e funciona em qualquer caixa.
- Código de barras por linha: pode valer como opção após teste com o PDV. Um Code 128 com o PLU pode ser lido como teclado por muitos leitores, mas normalmente lança apenas o código; quantidade, observação e confirmação ainda dependem do operador.
- QR por linha: não recomendo como padrão; muitos leitores de caixa leem somente códigos 1D, e o QR não resolve o formato esperado pelo PDV.
- QR único da conferência só tem valor se o fornecedor do PDV documentar um formato de importação. Sem integração correspondente, é apenas um texto que o PDV não entende.

## M4 — Três cenários de caixa

**Veredito: ACEITO EM PARTE.** Desenhar para **PDV fechado sem API** é o melhor caso-base, mas ele não cobre totalmente quem não possui caixa.

1. **Sem sistema de caixa:** Salgaê mostra a conferência e relatórios operacionais. O estabelecimento ainda precisa definir recebimento, controle financeiro e obrigação fiscal fora do sistema. Não ampliar o MVP para um PDV completo sem decisão própria.
2. **PDV fechado sem API — caso-base:** conferência na tela/papel, PLU opcional e digitação/leitura assistida pelo operador. O Salgaê nunca presume que o PDV recebeu os itens.
3. **PDV com API/importação documentada:** criar um adaptador específico, com fila, idempotência, retorno de sucesso/erro e reconciliação. Integração futura não deve mudar os pedidos já gravados.

## M5 — Divergência de preços

**Veredito: ACEITO EM PARTE.** O preço visto e confirmado no Salgaê deve ficar congelado no pedido aceito; chamá-lo só de “referência” enfraquece a conferência. **INCERTO JURÍDICO:** a regra comercial aplicável em caso de divergência deve ser validada com contador/orientação de defesa do consumidor.

- **FATO NO REPOSITÓRIO:** hoje o catálogo guarda `products.price_cents` como inteiro obrigatório, não negativo. Ainda não há pedido nem snapshot.
- O servidor deve copiar nome, preço unitário e PLU do produto para o item ao receber/aceitar o pedido. O navegador não informa o preço válido.
- Antes de cobrar, a tela deve evidenciar diferença conhecida entre Salgaê e PDV. O operador resolve conforme política aprovada; não se escolhe silenciosamente o maior valor.
- O relatório diário deve separar vendidos/aceitos, cancelados, reaberturas e totais por mesa e produto. Ele ajuda a reconciliar, mas não substitui a conferência no fechamento de cada mesa.
- Alteração ou abatimento exige motivo, ator e histórico; nunca reescrever o snapshot original.

## M6 — NFC e QR da mesma mesa

**Veredito: ACEITO EM PARTE.** NFC e QR devem abrir a mesma URL HTTPS e identificar a mesma mesa. Recomendo, porém, tratar o valor físico como **localizador opaco estável**, não como a única credencial de segurança.

- A segurança principal continua sendo: primeiro pedido `pending_acceptance`, aceite visual pelo atendente, sessão com prazo, rate limit, idempotência e fechamento da mesa.
- Travar a tag contra regravação é recomendado depois de validar a URL. O bloqueio permanente pode ser irreversível; proteção por senha de tag barata não deve ser tratada como criptografia forte.
- Referência técnica sem teste físico nesta rodada: NTAG213 oferece 144 bytes de memória de usuário e NTAG215, 504 bytes. Um NDEF URI tem cabeçalhos além da URL. Uma URL curta, por exemplo `https://dominio.com/t/<token-curto>` com cerca de 60–100 bytes ASCII, deve caber no NTAG213; o payload gerado pelo gravador deve ser medido antes da compra em lote.
- **INCERTO por aparelho/SO:** Android moderno em geral abre NDEF/HTTPS com NFC ligado e tela desbloqueada; iPhones mais recentes fazem leitura em segundo plano, enquanto modelos/versões anteriores podem exigir o leitor NFC. É obrigatório testar aparelhos reais e manter o QR como alternativa universal.
- Rotação sem trocar o cartão tem limite lógico: se a URL física fotografada continua válida, a cópia também continua válida. Um redirecionamento não distingue a mesa da fotografia.
- Desenho recomendado: manter o localizador físico estável e rotacionar a **sessão de atendimento** no servidor. Trocar/regravar NFC e reimprimir QR somente quando o localizador for abusado, o cartão for substituído ou a URL/domínio mudar. Se for necessário invalidar de verdade uma foto, os dois meios físicos precisam receber outra URL.
- Não depender do UID do chip NFC: navegadores comuns não o fornecem de modo confiável, e ele não existe no fluxo do QR.

## M7 — ID, rótulo e token da mesa

**Veredito: ACEITO.** São três conceitos separados: `id` interno imutável, `label` humano (“Mesa 5”) e localizador/token opaco. O cliente nunca escolhe o `id` enviado ao pedido.

- No tablet do atendente, o primeiro pedido aparece destacado no topo: **“MESA 5 — PRIMEIRO PEDIDO — CONFIRMAR OCUPAÇÃO”**, com idade da espera, total, itens e botões aceitar/rejeitar.
- Na cozinha, o rótulo da mesa deve ser o elemento maior do cartão; depois vêm número do pedido, tempo, itens e estado. Cor não pode ser o único sinal de estado.
- Agrupar visualmente pedidos abertos pela mesa, sem fundir os números dos pedidos. Assim a cozinha sabe a origem e o caixa consegue conferir cada envio.
- Renomear mesa: bloquear durante sessão `pending/open/closing` ou agendar para depois do fechamento. Conferências e histórico guardam `table_label_snapshot`.
- Juntar mesas: criar agrupamento/conta principal explícita, exibida como “Mesa 5 + Mesa 6”; preservar mesa de origem e pedidos. Não reescrever pedidos antigos.
- Trocar cliente de mesa: ação do atendente, com origem, destino, motivo e horário. Pedidos já enviados preservam a origem; pedidos futuros usam o destino. A conferência consolidada mostra a transferência.

## M8 — Ciclo da conta e novas compras

**Veredito: ACEITO EM PARTE.** “Conta pedida” e “papel impresso” não devem ser o mesmo evento. Às vezes o operador só quer uma parcial.

- Estados da sessão: `pending` → `open` → `closing` → `closed`, além de `rejected`/`expired`. `closing` significa conta pedida e bloqueia novos pedidos.
- Uma **conferência parcial** pode ser impressa em `open`, marcada “PARCIAL — MESA ABERTA”; não bloqueia pedidos.
- Ao pedir a conta, passar para `closing`, aguardar a regra definida para pedidos ainda em preparo e gerar a conferência numerada e versionada.
- Reimprimir exatamente a mesma versão: marcar **“2ª VIA”** e registrar quem/quando. Não somar nem lançar novamente por causa da reimpressão.
- Para novo pedido após `closing`, o atendente precisa **reabrir**. A conferência anterior vira “substituída”; a próxima é “CONFERÊNCIA ATUALIZADA — V2”, não “2ª via”, e destaca pedidos/valores acrescentados.
- Só permitir `closed` após confirmação humana de que a versão mais recente foi conferida no caixa. Fechar não significa “pago” se o Salgaê não registra pagamento.
- A tela deve alertar: “há pedidos posteriores à última conferência” e impedir fechamento silencioso. Número da sessão, versão, pedidos incluídos e total evitam esquecimento; a cobrança duplicada ainda exige conferência do operador no PDV fechado.

## Ponte realista com um PDV fechado

- **Funciona de verdade, com participação humana:** PLU em texto; código de barras por item lido por scanner configurado como teclado; conferência lado a lado com o PDV. É simples e auditável, mas não importa a conta inteira.
- **Funciona se o fornecedor documentar:** API, webhook ou importação de CSV/TXT/XML com esquema, identificador único, confirmação e tratamento de erro. Muitos PDVs importam cadastro, não venda; é preciso confirmar o recurso exato.
- **Gambiarra frágil:** agente ou dispositivo USB que emula teclado e digita sequências no PDV. Depende de foco, telas, atalhos, tempo e versão; um campo errado pode lançar valores incorretos. Só considerar em piloto controlado e com revisão humana.
- **Não funciona como integração:** imprimir na mesma impressora/“porta de comanda” não insere itens no banco do PDV; apenas produz papel, salvo protocolo oficial do fornecedor.
- **Não recomendo:** automação por cliques/RPA como produto geral, escrever direto no banco do PDV, interceptar porta da impressora, burlar licença ou simular documento fiscal. São frágeis, sem confirmação transacional e podem perder suporte/integridade.

## Riscos fiscais e legais no Brasil

**INCERTO JURÍDICO/FISCAL:** esta rodada não consultou rede, norma, contador nem SEFAZ; regras variam por operação e local. Antes do piloto, o responsável deve validar o papel e o fluxo com contador/assessoria fiscal. Não estou afirmando uma obrigação legal específica.

- Usar o título **“CONFERÊNCIA DE CONSUMO”** ou **“PRÉ-CONTA”** e o aviso destacado **“NÃO É DOCUMENTO FISCAL”**.
- Não usar aparência ou termos de documento fiscal: “Nota Fiscal”, “NFC-e”, “CF-e”, “SAT”, “DANFE”, chave de acesso, protocolo/autorização, QR fiscal ou numeração fiscal.
- Pode conter dados operacionais: loja, mesa, pedidos, itens, quantidades, preços, total de conferência, horários e identificador interno.
- Evitar “pago”, “quitado”, forma de pagamento e troco se o Salgaê não presenciou/registrou a liquidação. A pré-conta não comprova pagamento.
- **INCERTO:** exigência de identificação empresarial, tributos, taxa de serviço, arredondamento, guarda do papel, diferença de preço e momento obrigatório da emissão fiscal. Validar antes de fechar o layout.

## Mudanças no modelo de dados da rodada 1

Sem DDL; lista conceitual:

- `products` (alterada): `pos_code text null`.
- `dining_tables` (ajustada): `id`, `label`, `is_active`, `locator_hash`, `locator_version`, datas de emissão/bloqueio do cartão. Não precisa guardar UID NFC.
- `table_sessions` (ajustada): estados `pending/open/closing/closed/rejected/expired`, aceite/rejeição, `table_label_snapshot`, pedido/retirada da conta, fechamento e campos de transferência/agrupamento.
- `orders` (ajustada): `pending_acceptance`, `accepted_by/at`, mesa/sessão, número visível, totais e estados já propostos.
- `order_items` (ajustada): `product_name_snapshot`, `unit_price_cents`, `pos_code_snapshot`, quantidade e total de linha.
- `prebills` (nova): sessão, número, versão, tipo `partial/closing`, total, estado `current/superseded`, gerador e horários.
- `prebill_orders` (nova): quais pedidos entram em cada versão; impede que uma reimpressão recalcule conteúdo diferente.
- `print_events` (nova): conferência, cópia/2ª via, operador, horário, largura e resultado informado. Não prova que o papel saiu fisicamente.
- `table_session_events` (nova ou parte do log operacional): aceite, rejeição, reabertura, fechamento, transferência e agrupamento.
- Integração futura: `pos_exports`/`pos_export_attempts` somente quando existir API/importação concreta; não criar abstração sem fornecedor.

## Hardware mínimo por cenário

Todos os cenários usam cartão NFC + QR por mesa; o telefone é do cliente. Para a operação: um telefone/tablet autenticado do atendente para aceitar o primeiro pedido e uma tela sempre ligada na cozinha. Em equipe pequena, caixa e atendente podem compartilhar dispositivo; a cozinha deve ter tela própria.

| Cenário | Mínimo | Impressão |
| --- | --- | --- |
| Sem PDV | Dispositivo do atendente/caixa + tablet/PC da cozinha | Opcional; pré-conta pode ser mostrada na tela ou anotada. O processo fiscal/financeiro continua externo. |
| PDV fechado | Terminal já usado pelo PDV + dispositivo do atendente + tela da cozinha | Térmica 58/80 mm no computador do caixa é útil, mas não obrigatória. Scanner é opcional após teste de PLU. |
| PDV com API/importação | Mesmo conjunto; integração roda no servidor | Impressora opcional. API não exige hardware novo; importação local pode exigir conector homologado. |

Sem impressora, nada se perde: a conferência fica em tela com versão e total, pode ser mostrada ao cliente, e o operador lança no caixa. PDF para download pode ser conveniência, mas não deve ser chamado de documento fiscal nem ser requisito para fechar a mesa.

## Perguntas ao responsável

1. Quantas mesas existem e quais nomes devem aparecer (“Mesa 1”, “Varanda 1”, balcão etc.)?
2. Clientes podem juntar mesas ou trocar de mesa? Quem pode autorizar isso?
3. Em quantos minutos o primeiro pedido pendente expira, e o atendente confirma olhando a mesa antes de aceitar?
4. Ao pedir a conta, novos pedidos ficam bloqueados até o atendente reabrir, como recomendado?
5. A cozinha usará tablet/PC, papel automático no futuro, ou os dois? Qual hardware já existe?
6. No primeiro restaurante há nenhum caixa, PDV fechado ou PDV integrável? Qual marca/modelo e ele aceita PLU, arquivo ou API?
7. Há impressora térmica e leitor de código? Informe marca, modelo, conexão e aparelho ao qual estão ligados.
8. Qual política vale quando o preço do Salgaê difere do PDV, e quem validará pré-conta/emissão fiscal com o contador?

## Fatos finais verificados no repositório

- `products` possui `price_cents integer not null check (price_cents >= 0)`, além de `is_active` e `is_available`; não possui PLU/código de caixa.
- Não existem hoje migrations de mesas, sessões, pedidos, pré-contas ou integração com PDV.
- O projeto atual tem somente o papel `admin` no `check` de `profiles.role`; papéis de atendente/cozinha continuam trabalho futuro.
- As migrations atuais tratam catálogo, dados da loja, auditoria básica, RLS e mídia. Nenhuma delas implementa impressão ou emissão fiscal.

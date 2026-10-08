---
titulo: "Protótipos e telas"
area: Design
tags:
  - design
  - ui
  - produto
atualizado: 2026-10-08
---
# Protótipos e telas

Voltar: [[_Indice-04-Design-e-Identidade-Visual]] · Relacionado: [[16-Identidade-Visual]] · [[17-Design-System-UI]] · [[04-Experiencia-do-Cliente]]

## O que existe no pacote

| Página | Conteúdo |
| --- | --- |
| `Sistema Cardapio Brasa e Osso.dc.html` | Índice geral: capa, cartões dos quatro blocos e listas de escopo. |
| `Design System.dc.html` | Fundamentos: paleta, tipografia, componentes, regra do NFC. |
| `Cardapio Local.dc.html` | Protótipo navegável do cardápio de mesa (3 telas). |
| `Cardapio Delivery.dc.html` | Protótipo navegável do delivery com carrinho (5 telas). |
| `Painel Admin.dc.html` | Painel administrativo desktop. |
| `Painel Admin Mobile.dc.html` | Mesmo painel otimizado para celular. |
| `Canvas.dc.html` | **Vazio.** Arquivo sem conteúdo. |

Os protótipos são interativos de verdade: têm estado, filtros, carrinho persistente entre telas, toggles e modais funcionando.

## Cardápio local — 3 telas

Acesso pelo NFC da mesa. É **somente consulta**: não há carrinho nem botão de chamar atendente.

| ID | Tela | Elementos |
| --- | --- | --- |
| L01 | Início | Topo com menu, logo e info · hero escuro "Coxinha do Chef" com badge "Quentinho" e indicador de carrossel (3 pontos) · fila de chips de categoria · lista horizontal "Mais pedidos" com contador de itens · banner "Combo do dia" com selo de 20% de economia. |
| L02 | Detalhe do produto | Imagem de 260 px, botão voltar flutuante, bottom sheet com nome, categoria, preço em laranja, descrição, chips de ingredientes, aviso *"Consulta apenas. Faça seu pedido com o atendente."* e botão "Voltar ao cardápio". |
| L03 | Busca | Campo em foco laranja, dica de termos, resultados em grade de 2 colunas e estado vazio ilustrado ("Nada por aqui"). |

Categorias do protótipo: Todos, Coxinhas, Pastéis, Porções, Combos, Drinks, Doces.

## Cardápio delivery — 5 telas

| ID | Tela | Elementos |
| --- | --- | --- |
| D01 | Home | Igual à L01, mais: campo de busca no topo, botão de carrinho com contador, botão `+` de adição rápida em cada cartão, barra "Ver carrinho" quando há itens e bottom nav de 5 abas (Início, Cardápio, Pedido, Ofertas, Perfil). |
| D02 | Detalhe | Campo de observações livre ("Sem cebola, ponto da carne…"), stepper de quantidade e botão fixo "Adicionar ao carrinho" com o total já calculado. |
| D03 | Carrinho | Itens com miniatura, observação em itálico, stepper que remove o item ao chegar a zero, resumo com subtotal + entrega (R$ 6,00 fixos) + total, e estado vazio. |
| D04 | Cadastro | Nome, telefone, rua/número, complemento; escolha de pagamento **na entrega** (PIX, débito, dinheiro); resumo do valor; botão "Confirmar pedido". |
| D05 | Confirmação | Marca de verificação laranja, número do pedido, tempo estimado de 30–40 min, resumo em cartão escuro e dados de entrega. |

## Painel administrativo

Seções na sidebar: **Dashboard**, **Produtos** (com contador de estoque baixo no badge), **Categorias**, **Destaques**. No rodapé da sidebar, indicador "Status da loja · Aberta · aceitando".

- **Dashboard** — três cartões de número (produtos ativos, categorias, estoque baixo) e um aviso destacado de que os pedidos chegam pelo WhatsApp.
- **Produtos** — tabela com miniatura, nome, categoria, preço, controle de estoque inline (`−` número `+`) e badge de status. Estados: `Ativo`, `Promoção`, `Indisponível` (estoque zerado), `Desativado`, além dos avisos `BAIXO` e `ESGOTADO`. Produtos sem controle de estoque mostram "sem controle" em itálico.
- **Edição de produto** — página inteira (não modal): coluna de foto com área de upload pontilhada (JPG/PNG, até 5 MB) e coluna de campos com nome, preço, categoria, toggle "Produto ativo" e toggle "Controlar estoque" que revela quantidade atual e limite de alerta.
- **Categorias** — grade de 3 colunas com miniatura, contagem de produtos e ações editar/excluir; modal de edição.
- **Destaques** — lista ordenada por posição, com badge do tipo, toggle de ativo e ações; modal de edição.
- **Exclusão** — sempre passa por modal de confirmação com ícone de alerta e aviso de que a ação não pode ser desfeita.

A versão mobile cobre exatamente as mesmas quatro áreas, com abas no rodapé, saudação "Olá, Salgaê 👋", atalho de alerta de estoque baixo, três ações rápidas (novo produto/categoria/destaque) e edição em tela cheia.

Regra de negócio embutida no design: **estoque zerado deixa o produto indisponível no cardápio automaticamente**, sem excluí-lo.

## Dados fictícios usados

Produtos: Coxinha Cremosa (R$ 7,90), Coxinha Catupiry (R$ 8,90), Bolinha de Queijo (R$ 8,90), Pastel de Carne (R$ 8,50), Risole de Camarão (R$ 9,90), Batata Frita (R$ 6,00), Combo Duplo (R$ 12,00), Suco de Laranja (R$ 5,00), Brigadeiro (R$ 3,50). Servem como massa de teste realista para *seeds* de desenvolvimento.

## Lacunas e divergências a resolver

Pontos em que o design está incompleto ou conflita com o que já está escrito no vault. Nenhum deles foi decidido aqui — precisam virar entrada em [[03-Decisoes-do-Projeto]].

1. **Delivery × escopo atual.** O protótipo inteiro se chama "MVP de delivery" e entrega carrinho, taxa de entrega e checkout. O [[02-Escopo-Atual]] coloca delivery, carrinho, checkout e taxa de entrega **fora do escopo**, e [[03-Decisoes-do-Projeto]] registra essa escolha. Ou o escopo mudou e precisa ser reescrito, ou o protótipo está à frente do que será construído.
2. **Destino do pedido.** A tela D05 diz "Pedido enviado! #4821" com tempo estimado, sugerindo um sistema que recebe pedidos; o painel admin afirma o contrário — *"Sem gestão de status aqui — você atende direto no WhatsApp"*. Falta definir e desenhar a ponte entre o checkout e o WhatsApp.
3. **Tela de Pedidos desativada.** Existe no código do painel uma seção completa de pedidos (filtros, status `novo → preparando → saiu`, avanço de status), mas ela está desligada e marcada como "PEDIDOS REMOVIDOS · fluxo via WhatsApp". O material está pronto caso a decisão mude.
4. **Modal de edição legado.** Também no painel, um modal antigo de edição de produto continua no arquivo, desativado, substituído pela página em tela cheia. Não reimplementar.
5. **QR Code ausente.** O [[02-Escopo-Atual]] exige QR Code como contingência do NFC; nenhuma tela do protótipo o menciona.
6. **Busca só no local.** O cardápio local tem tela de busca completa; no delivery o campo de busca é apenas decorativo, sem tela de resultados.
7. **Bottom nav do cardápio local.** O protótipo não tem navegação inferior, mas há uma referência visual no pacote com as abas Início · Cardápio · Ofertas · **Mesa 12** — ou seja, a ideia de identificar a mesa existiu e não foi levada adiante.
8. **Admin mobile fora do índice.** A página existe e está completa, mas não aparece nos cartões do índice nem no menu das outras páginas (só no menu dela mesma).
9. **Tokens com nome errado.** "Verde" é `#17110D` e "Sucesso" é `#B84C1F`; a fonte de texto anunciada é Inter mas a carregada é Nunito Sans. Detalhado em [[17-Design-System-UI]].
10. **Nome do arquivo índice.** A página principal ainda se chama `Sistema Cardapio Brasa e Osso.dc.html`, herança de outro projeto.
11. **Vídeo do produto sem tela.** O vídeo curto opcional foi decidido depois do protótipo (ver [[03-Decisoes-do-Projeto]]). Falta desenhar o player no detalhe L02 (capa com ícone de play, pausa) e o campo de upload na edição de produto do painel.

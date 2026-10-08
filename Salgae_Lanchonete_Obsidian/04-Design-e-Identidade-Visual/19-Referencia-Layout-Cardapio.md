---
titulo: "Referência de layout do cardápio"
area: Design
tags:
  - design
  - ui
  - produto
atualizado: 2026-10-08
---
# Referência de layout do cardápio

Voltar: [[_Indice-04-Design-e-Identidade-Visual]] · Relacionado: [[17-Design-System-UI]] · [[18-Prototipos-e-Telas]] · [[04-Experiencia-do-Cliente]]

A tela inicial do cardápio público segue o **layout, o design, a organização dos cards e a tipografia** desta referência. Ela substitui a L01 do protótipo como base visual da home. A identidade (cores, logo, tom de voz) continua sendo a da Salgaê.

![[referencias/referencia-cardapio-home.webp|360]]

> A referência é de um app de delivery de outra marca. Usamos a **estrutura e o estilo**, nunca a marca, as fotos ou os textos dela.

## Anatomia da tela (de cima para baixo)

| # | Bloco | Como é na referência | Medidas aproximadas (tela de 390 px) |
| --- | --- | --- | --- |
| 1 | Cabeçalho | Botão de menu quadrado-arredondado à esquerda; saudação curta + logo + slogan ao centro-esquerda; botões de ícone à direita. | Botões 44–48 px, raio 14–16 px, fundo branco com sombra suave. |
| 2 | Busca | Campo em pílula, branco, ícone de lupa e placeholder; botão de filtro quadrado-arredondado ao lado. | Altura 48 px. |
| 3 | Banner principal (carrossel) | Card grande com fundo escuro, rótulo pequeno em caixa alta, título enorme em fonte condensada e pesada (3 linhas), subtítulo, botão em pílula com seta, foto do produto à direita e indicador de páginas (pontos). | Altura ~200 px, raio 20–24 px. |
| 4 | Categorias | Fila horizontal rolável de círculos com foto do produto e rótulo abaixo; a categoria ativa ganha anel colorido e rótulo na cor da marca. | Círculos 60–64 px. |
| 5 | Título de seção | Título em negrito à esquerda e link "Ver todos →" na cor da marca à direita. | Título 18 px/700. |
| 6 | Cards de produto | Fila horizontal com ~2,3 cards visíveis; card branco com badge no canto superior esquerdo, foto, nome em negrito, descrição curta em cinza (até 2 linhas), preço grande e botão circular na cor da marca no canto inferior direito. | Card 150–160 px de largura, raio 16 px; preço 16–18 px/800. |
| 7 | Banner de oferta | Faixa clara (pêssego) com rótulo, título, subtítulo, botão em pílula, foto e selo circular de desconto. | Altura ~130 px, raio 20 px. |
| 8 | Barra inferior | 5 abas com ícone + rótulo; botão central elevado em círculo na cor da marca. | Ícone central ~56 px. |

## Tipografia

O estilo da referência se resolve com as fontes que já estão no [[17-Design-System-UI]], mais uma fonte de destaque:

| Uso | Fonte | Peso / tamanho |
| --- | --- | --- |
| Título do banner principal | **Condensada pesada em caixa alta** (proposta: *Anton* ou *Bebas Neue*) | 32–40 px, entrelinha apertada (~0,95) |
| Nome do produto, títulos de seção, preço | Poppins | 600–800; nome 13–14 px, seção 18 px, preço 16–18 px |
| Descrição, saudação, botões | Nunito Sans | 400–600; 11–14 px |
| Badges e rótulos pequenos ("EXCLUSIVE OFFER", "BESTSELLER") | Poppins ou JetBrains Mono em caixa alta | 9–10 px, `letter-spacing` 0,08–0,12em |

## Adaptação para a Salgaê

O cardápio é **somente consulta no local** ([[02-Escopo-Atual]]). Tudo que a referência tem de pedido, conta ou avaliação precisa ser retirado ou trocado:

| Na referência | Na Salgaê |
| --- | --- |
| Vermelho como cor principal | Laranja de ação `#E65F2A` (marca `#FC4C0B`). Banner escuro em tinta `#17110D` ou verde da marca `#02432D` (ver divergência em [[16-Identidade-Visual]]). |
| Logo e slogan da outra marca | Logo Salgaê + assinatura `SALGADOS QUENTES`; saudação no tom da casa (ex.: *"Olá! Bem-vindo à Salgaê 👋"*). |
| Sino de notificações e sacola com contador | **Remover.** No lugar, um único botão de informações (horário, endereço, contato). |
| Botão "Order Now" no banner | Trocar por *"Ver produto"* / *"Conferir"*, levando ao detalhe ou à categoria. |
| Botão `+` (adicionar ao carrinho) no card | Trocar por seta `→` que abre o detalhe do produto (mesmo padrão do protótipo local). |
| Coração de favoritos | **Remover** (não há conta de cliente). |
| Estrelas e número de avaliações | **Remover.** Não há sistema de avaliação; exibir nota inventada seria enganoso. |
| Badges "BESTSELLER", "POPULAR", "SAVE 15%" | Badges da casa: `MAIS PEDIDO`, `NOVO`, `QUENTINHO`, `PROMO`, além de `INDISPONÍVEL`. Exigem campo próprio no produto (ver pendências). |
| Banner "Up to 30% OFF" | Vem da tabela `highlights` (destaques configuráveis pelo painel). |
| Aba central "Orders" e aba "Profile" | **Remover.** Barra inferior proposta: Início · Cardápio · Busca · Info, sem botão central de pedido. |
| Botão de filtro ao lado da busca | Fora do MVP; manter só a busca. |

Regras que continuam valendo nesta tela:

- produto **indisponível** aparece com foto esmaecida e badge `INDISPONÍVEL`, conforme [[04-Experiencia-do-Cliente]];
- foto ausente usa o componente de *fallback* listrado do [[17-Design-System-UI]];
- o **vídeo** do produto aparece só no detalhe, nunca nos cards da home ([[08-Imagens-e-Storage]]).

## Pendências para decidir

Registrar as respostas em [[03-Decisoes-do-Projeto]]:

1. Cor escura dos banners: tinta `#17110D` ou verde da marca `#02432D`.
2. Fonte condensada do título do banner: *Anton*, *Bebas Neue* ou outra.
3. Badges de produto: criar campo `badge` em `products` (e, se houver `PROMO`, um preço promocional) — muda o [[07-Modelo-de-Dados-Supabase]].
4. Barra inferior: confirmar as abas Início · Cardápio · Busca · Info, ou não ter barra.
5. Fotos das categorias: usar uma foto própria por categoria (campo `image_path` já existe em `categories`) ou emoji, como no protótipo.

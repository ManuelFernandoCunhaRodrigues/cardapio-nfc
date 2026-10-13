# Refatoração de design — especificação (fase 1: só desenho)

Data: 2026-10-10 · Estado: **proposta para avaliação do responsável**. Nenhum código de aplicação foi alterado.

- Arquivo no Figma: <https://www.figma.com/design/cKQKpT55gwzYVY1p7uuWNL> — "Salgaê — Refatoração de design (2026-10)"
- Imagens exportadas: `docs/design/refatoracao/telas/` (15 PNG) e `docs/design/refatoracao/pranchas/` (3 JPEG de resumo)
- Referência analisada: tela inicial do app "Ember & Grill" (hamburgueria), enviada pelo responsável
- Design atual comparado: <https://salgae-homologacao.vercel.app> e o código em `app/(public)`, `app/admin`, `components/menu`, `components/admin`

## 1. O que a referência ensina (e o que foi aproveitado)

| Aspecto | Na referência | Na proposta |
| --- | --- | --- |
| Layout | Página clara e quente, cartões brancos flutuando, tudo cabe em uma tela: cabeçalho, busca, banner, categorias, cartões, faixa, barra | Mesma ordem e mesma densidade. Fundo passa de branco puro para **creme** (`#FAF7EF`) com cartões brancos |
| Logo | Centralizada no topo, entre o menu (esquerda) e os ícones (direita) | **Logo centralizada** em todas as telas principais, entre o status da loja (esquerda) e o botão de informações (direita) |
| Tipografia | Uma família sem serifa geométrica em vários pesos; título do banner em duas cores; rótulos pequenos em caixa alta | **Duas famílias** em vez de quatro: Poppins (títulos, preços, rótulos, botões) e Nunito Sans (texto corrido). Anton e JetBrains Mono saem |
| Banner | Escuro, foto grande à direita, etiqueta, título em duas cores, botão em pílula, pontos de página | Igual, com a tinta da casa (`#17110D`), brilho laranja atrás da comida e a última palavra do título em âmbar |
| Categorias | Círculos com item isolado e rótulo | Círculos brancos de 52 px com a foto da categoria, sem "ativo" na home (lá são atalhos) |
| Cartões | Selo, foto, nome, avaliação, preço, botão "+" | Selo, foto, nome, descrição em 1 linha, preço e **seta** (abre o detalhe). Sem estrelas, sem "+" |
| Faixa de oferta | "Save 20%" | Segundo destaque cadastrado no painel, **sem desconto** |
| Barra inferior | 5 abas, botão central "Order" | 4 abas reais, item ativo em pílula; **sem botão central** |

## 2. Tokens

### Cores (variáveis "Salgaê / Cores" no Figma)

Os hex que já existem em `app/globals.css` não mudam. Os itens marcados como **novo** ainda não existem no código e teriam de ser criados (`green`, `green-soft`, `amber-soft`, `danger-soft`, `peach`); o `positive` atual (`#A8441B`) deixaria de ser usado para "aberta/ativo". Mudanças:

| Token no Figma | Hex | Situação | Uso |
| --- | --- | --- | --- |
| tinta | `#17110D` | mantém (`ink`) | texto principal, banner, menu lateral, botão secundário |
| marca | `#E65F2A` | mantém (`brand`) | fundos sem texto, anel de foco, brilho |
| marca-forte | `#C2491A` | mantém (`brand-strong`) | botão primário, preço, link, item ativo |
| creme | `#FAF7EF` | **novo papel**: fundo da página pública e do painel | antes só superfície de cartão |
| branco | `#FFFFFF` | **novo papel**: superfície de cartão | antes era o fundo da página pública |
| areia, areia-escura, superficie-interna, borda, borda-interna | iguais | mantém | chips, campos, divisores |
| texto-secundario, texto-corpo, placeholder | iguais | mantém | |
| ambar | `#F9A436` | mantém | palavra de destaque no banner escuro |
| ambar-suave | `#FDEFD8` | novo (equivale a `amber/15` sobre branco) | aviso da loja, etiqueta INDISPONÍVEL do painel |
| **verde** | `#02432D` | **novo na interface** — é o verde da sombra do logo | loja **Aberta**, "Disponível agora", selo NOVO, alternador ligado |
| verde-suave | `#E3EFE8` | novo | fundo dos estados positivos |
| perigo | `#983F22` | mantém (`danger`) | Fechada, INDISPONÍVEL, DESATIVADO |
| perigo-suave | `#F5E6E0` | novo (equivale a `danger/10`) | fundo dos estados negativos |
| pessego | `#FFE0C9` | já existia solto no código (`#FFE0C9`) → vira token | item ativo da barra, "hoje" nos horários |

Por que o verde: hoje "Aberta" usa `positive` (`#A8441B`, marrom-alaranjado) e "Fechada" usa `danger` (`#983F22`, marrom-avermelhado). São dois tons quase iguais para estados opostos. O verde já é da marca (nota 16 do vault registra que a interface não o usava) e resolve a distinção sem depender só de matiz parecido — cada estado também tem texto e ícone.

Contraste medido (WCAG 2.1): tinta/creme 17,5 · corpo/creme 11,3 · secundário/creme 5,8 · secundário/branco 6,3 · placeholder/branco 5,8 · marca-forte/branco 4,9 · marca-forte/creme 4,6 · branco/marca-forte 4,9 · âmbar/tinta 9,3 · verde/verde-suave 9,6 · branco/verde 11,4 · perigo/perigo-suave 5,6 · branco/perigo 6,8. Todos ≥ 4,5 para texto. Ícone marca-forte sobre pêssego: 3,9 (≥ 3 exigido para elemento gráfico; não há texto sobre o pêssego nessa cor).

### Tipografia (estilos de texto no Figma)

| Estilo | Fonte | Tamanho / entrelinha | Onde |
| --- | --- | --- | --- |
| Título/Hero | Poppins Bold | 28 / 32, −2% | título do banner |
| Título/Página | Poppins Bold | 24 / 30 | nome do produto, títulos de página, status da loja |
| Título/Desktop | Poppins Bold | 28 / 36 | títulos do painel no desktop |
| Título/Seção | Poppins SemiBold | 18 / 24 | "Mais pedidos", categorias, cartões do painel |
| Título/Cartão | Poppins SemiBold | 14 / 18 | nome do produto em cartão e lista |
| Preço/G · Preço/M | Poppins Bold | 26 / 32 · 16 / 20 | preço no detalhe · preço em cartão |
| Número/KPI | Poppins Bold | 32 / 36 | números do resumo |
| Rótulo/Caixa-alta | Poppins SemiBold | 10 / 12, +8%, caixa alta | selos, etiquetas, cabeçalho de tabela, assinatura |
| Botão · Nav | Poppins SemiBold 14 / 20 · Poppins Medium 11 / 14 | | botões · abas |
| Corpo/M · Corpo/M forte | Nunito Sans Regular/Bold | 14 / 20 | descrição, campos, avisos |
| Corpo/P · Corpo/P forte | Nunito Sans Regular/Bold | 12 / 16 | legendas, descrição em cartão |

O que muda em relação ao código atual:

- **Sai a Anton** do título do banner (hoje `.display`, 36 px em caixa mista condensada). A referência usa a mesma família do resto, em duas cores. Entra Poppins Bold 28/32 com a última palavra em âmbar. Isso **revê a decisão de 2026-10-08** (nota 19 do vault), que vinha da referência anterior — precisa da confirmação do responsável.
- **Sai a JetBrains Mono** dos rótulos (`.lbl`, 8–10 px). Entra Poppins SemiBold 10 px em caixa alta. O tamanho mínimo de rótulo sobe de 8 px para 10 px.
- Poppins passa a usar 500/600/700 (o 800 deixa de ser necessário). Nunito Sans usa 400 e 700.
- Efeito no desempenho: duas famílias a menos para baixar na primeira visita.

### Forma

Pílula (999) em botões, chips, selos e busca — mantém. Cartão de produto 16 · cartão grande e listas 20 · banner 24 · folha do detalhe 28 · barra inferior com cantos superiores de 24. Sombra de cartão `0 2px 10px rgba(23,17,13,.07)`; sombra da marca só no botão primário.

## 3. Posição da logo

- **Onde:** centro do cabeçalho, 44 px de altura (≈ 79 px de largura) no cardápio; 38 px no painel pelo celular; 76 px no topo do menu lateral do desktop; 120 px no login. Abaixo dela, a assinatura `SALGADOS QUENTES` (cardápio) ou `PAINEL` (administração).
- **Como fica centralizada de verdade:** o cabeçalho tem três colunas; as duas laterais têm a mesma largura (104 px), então a logo não "escorrega" quando o conteúdo de um lado muda (por exemplo "Aberta" → "Fechada").
- **O que fica dos lados:** à esquerda, o status da loja (Aberta/Fechada, leva a `/info`); à direita, o botão de informações (44×44). Hoje a logo fica à esquerda, com saudação em cima e o status embaixo, em quatro linhas empilhadas.
- **Por quê:** é o pedido do responsável e é o que a referência faz. Também libera altura: o cabeçalho cai de ~130 px para 68 px, e o banner sobe.
- **Diferença para a referência:** lá o lado esquerdo é um ícone de menu (☰). O produto não tem menu lateral — os quatro destinos já estão na barra inferior. Por isso o lugar foi dado a uma informação verdadeira e útil (loja aberta?). Existe no Figma a variante "Opção B com menu", só para comparação; ela exigiria criar um menu lateral novo.
- **Atenção na implementação:** o arquivo `public/brand/salgae-logo.webp` tem margens transparentes grandes (a arte ocupa ~62% da largura e da altura). Para a logo ter 44 px de altura *visível*, é preciso uma versão recortada do arquivo ou compensar no tamanho.
- A saudação "Olá! Bem-vindo à Salgaê 👋" sai do cabeçalho público (não cabe com a logo centralizada). O tom da casa continua no banner e nas mensagens.

## 4. Telas — o que muda

Dados usados em cada elemento estão entre parênteses. Nomes de produto, preços e textos são exemplos.

### Cardápio (cliente) — celular, 390×844

**01 — Início** (`app/(public)/(listas)/page.tsx`)
- Cabeçalho novo: status · logo · informações (`getStoreStatus`, rota `/info`).
- Busca em pílula, continua sendo um link para `/busca`. Sem botão de filtro.
- Aviso da loja em faixa âmbar-suave, só quando existe (`store_settings.notice`).
- Banner principal escuro, 196 px: etiqueta fixa "DESTAQUE DA CASA", título (`highlights.title`, última palavra em âmbar), texto (`highlights.description`), "Conferir →" (`highlights.target`), imagem à direita (`highlights.image_path`), pontos = quantidade de destaques. Hoje o banner é um degradê laranja com título em Anton.
- Categorias em círculos brancos de 52 px (`categories.name`, `categories.image_path`; emoji se não houver foto), levando a `/cardapio#slug`.
- "Mais pedidos" + "Ver todos →" (`sortProductsForHome`, 8 primeiros). Cartão compacto de 148 px: selo, foto, nome em 1 linha, descrição em 1 linha, preço e seta. Hoje a seta fica sobre a foto e o nome ocupa 2 linhas.
- Faixa laranja com o segundo destaque (`highlights[1]`). Hoje é uma caixa pêssego com botão escuro.
- Barra inferior nova (ver componentes).

**02 — Cardápio** (`app/(public)/(listas)/cardapio/page.tsx`)
- Chips de categoria fixos no topo, com o chip da seção visível marcado.
- **Lista vertical por categoria** em vez de carrosséis horizontais: cada produto é uma linha com foto de 56 px, nome + selo, descrição em 1 linha, preço e seta. Mostra 6 produtos por tela (hoje ~4, com rolagem lateral escondendo o resto). Contagem de itens ao lado do título da seção.
- Produto indisponível: foto sem cor, nome e preço em cinza, selo INDISPONÍVEL.

**03 — Detalhe do produto** e **03b — indisponível** (`app/(public)/produto/[id]/page.tsx`)
- Mídia de 340 px (hoje 260), botão voltar, botão de tocar o vídeo e etiqueta "VÍDEO CURTO · SEM SOM" quando há vídeo (`products.video_path`).
- Folha branca: categoria + selo, nome, preço, descrição, "Disponível agora" (verde) ou "Indisponível no momento — Pergunte ao atendente quando volta." (perigo), aviso "Consulta apenas. Faça seu pedido com o atendente.", botão "Voltar ao cardápio".
- No indisponível: foto sem cor, sem controle de vídeo, preço em cinza.

**04 — Busca (resultados)** e **04b — sem resultado** (`components/menu/search-results.tsx`)
- Campo em foco com anel laranja, contagem de resultados, grade de 2 colunas com o cartão "Grade".
- Vazio: "Nada por aqui", texto com o termo buscado, botão "Ver cardápio completo" (`/cardapio`) e atalhos de categoria (`/cardapio#slug`). Hoje o vazio é só texto, sem saída.

**05 — Info (aberta)** e **05b — fechada** (`app/(public)/(listas)/info/page.tsx`)
- Cartão de status em verde (Aberta · "Fecha às 18:00") ou perigo (Fechada · "Abre segunda às 08:00"), com o aviso dentro. O código hoje escreve só "Abre às 08:00"; o dia da semana desenhado depende de formatar `opensNext` (ver seção 7, item 10). Com fechamento manual não há próxima abertura: o texto fica "Fechada no momento", como hoje.
- Horários em cartão, dia de hoje marcado em pêssego com "· hoje".
- Endereço com "Ver no mapa" (`maps_url`) e três botões: Ligar (`phone`), WhatsApp (`whatsapp`), Instagram (`instagram`). Hoje o WhatsApp usa o mesmo ícone do telefone.

### Painel — celular, 390×844

**06 — Login** (`app/admin/login/page.tsx`, `login-form.tsx`): logo grande centralizada, título, cartão com E-mail, Senha e "Entrar no painel". Mesmos campos e mesma mensagem neutra de erro.

**07 — Resumo** (`app/admin/(painel)/page.tsx`): cabeçalho com status · logo · sair; quatro números (ativos, indisponíveis, sem foto, categorias) com cor de atenção quando > 0; "Novo produto" e "Nova categoria"; lista **"Precisam de atenção"** com os produtos indisponíveis ou sem foto.

**08 — Produtos** (`products-manager.tsx`): busca por nome, filtro de categoria em chips (hoje é um `select`), botão "+ Novo", cartões com foto, nome, categoria · preço, etiqueta de status e **alternador Disponível** como ação rápida (hoje é um botão de texto "Indisponível/Disponível" entre outros quatro botões). "⋯" reúne desativar, subir, descer e excluir.

**09 — Edição de produto** (`product-form.tsx`, `product-media-manager.tsx`): barra com voltar · título · ver no cardápio; foto e vídeo lado a lado no topo; nome; preço + "Disponível agora"; categoria e selo em chips; descrição; "Produto ativo"; **Salvar fixo no rodapé**. A barra de navegação inferior some nesta tela para dar espaço ao formulário.

### Painel — desktop, 1440×900

**10 — Resumo**: menu lateral escuro com a logo centralizada no topo, cinco áreas, status da loja e sair; quatro números em linha; "Precisam de atenção"; cartão "Loja hoje" (horário de hoje, aviso, "Editar dados da loja"); três atalhos (novo produto, nova categoria, novo destaque).

**11 — Produtos**: busca e filtro; tabela com Produto, Categoria, Preço, Selo, Status, Disponível (alternador) e Ações (editar, subir, descer, mais).

**12 — Edição de produto**: caminho "Produtos › nome", "Ver no cardápio" e "Salvar alterações" no topo; formulário à esquerda; "Foto e vídeo" e "Prévia no cardápio" à direita.

## 5. Componentes no Figma

Ficam na página "Cardápio (cliente) — celular", bloco "Componentes e estilos" (o plano gratuito do Figma limita o arquivo a 3 páginas): Botão (Primário, Secundário, Neutro, Perigo) · Selo (Mais pedido, Novo, Quentinho, Indisponível) · Status da loja (Aberta, Fechada) · Item de navegação (4 abas × ativo/inativo) · Barra inferior (4) · Cabeçalho público (aberta, fechada, opção B) · Cartão de produto (Compacto/Grade × disponível/indisponível) · Linha de produto (2) · Campo de formulário (3) · Alternador (2) · Etiqueta de status (4) · Cartão de número (3) · Barra inferior do painel (5) · Cabeçalho do painel (2) · Produto na lista do painel (3) · Menu lateral do painel (2).

## 6. O que da referência ficou de fora, e por quê

| Elemento da referência | Decisão | Motivo |
| --- | --- | --- |
| Ícone de menu (☰) à esquerda | trocado pelo status da loja | não existe menu lateral; os 4 destinos já estão na barra |
| Sino de notificações | fora | não há notificações |
| Carrinho com contador | fora | cardápio é só consulta |
| Botão de filtro ao lado da busca | fora | não há filtros; já estava fora do MVP |
| "Order now" | virou "Conferir →" | leva ao destino do destaque, não a um pedido |
| Estrelas e número de avaliações | fora | não há avaliações; no lugar entra a descrição |
| Botão "+" no cartão | virou seta | abre o detalhe |
| "Save 20%" | fora | não há preço promocional |
| Botão central elevado "Order" | fora | só existem 4 destinos e nenhuma ação de pedido |
| Abas "Offers" e "Profile" | fora | não há ofertas nem conta de cliente |
| Barra de status do telefone (9:41) | fora | é uma página no navegador, não um app instalado |

## 7. Impacto no código (para a fase de desenvolvimento)

Nada disto foi feito. Lista para orçamento e validação.

**Só estilo (sem mudança de comportamento)**
- `app/globals.css`: novos tokens `green`, `green-soft`, `amber-soft`, `danger-soft`, `peach`; fundo do corpo.
- `app/layout.tsx`: remover Anton e JetBrains Mono; pesos de Poppins e Nunito.
- `app/(public)/layout.tsx`: fundo creme.
- `components/menu/public-nav.tsx`: pílula no item ativo, cantos superiores arredondados, rótulo 11 px.
- `components/menu/product-card.tsx`, `product-card-link.tsx`: cartão compacto e cartão de grade.
- `app/(public)/(listas)/info/page.tsx`, `busca/page.tsx`, `components/menu/search-results.tsx`, `app/(public)/produto/[id]/page.tsx`.
- `components/ui/button.tsx`, `card.tsx`, `input.tsx`; `components/admin/login-form.tsx`, `app/admin/login/page.tsx`.
- `components/menu/icons.tsx`: ícones novos (WhatsApp, seta simples, check, alerta).

**Estrutura nova com os mesmos dados**
- Cabeçalho público compartilhado (hoje só a home tem cabeçalho, escrito dentro de `app/(public)/(listas)/page.tsx`) — novo componente `components/menu/public-header.tsx`, usado em Início, Cardápio, Busca e Info, de preferência por um novo `app/(public)/(listas)/layout.tsx`; a home perde o cabeçalho próprio. Precisa do status da loja nas quatro páginas (todas já usam `revalidate = 60`). O **detalhe do produto não recebe** esse cabeçalho: lá a foto ocupa o topo, com o botão voltar.
- `cardapio/page.tsx`: lista vertical (novo componente "linha de produto") no lugar de `ProductRow` + `ProductCard compact`.
- `components/admin/admin-shell.tsx`: cabeçalho do painel com logo, menu lateral com logo, ícones no lugar dos símbolos de texto (◼ ◫ ◇ ✦ ⌂) e barra inferior condicional por rota (item 8 abaixo).
- `components/admin/products-manager.tsx`: cartões e tabela novos; filtro em chips no celular.
- `components/admin/product-form.tsx`, `product-media-manager.tsx`: ordem dos blocos; mídia no topo.

**Comportamento novo, pequeno (precisa de decisão)**
1. Chip de categoria marcado conforme a rolagem em `/cardapio`. A página é um componente de servidor; isso pede uma pequena ilha de cliente só para os chips (observador de interseção, sincronizado com a âncora da URL e com o foco). Sem JavaScript, os chips continuam funcionando como links, todos iguais, como hoje.
2. Banner inteiro como link (hoje só o botão "Conferir", com 32 px de altura, é clicável).
3. Última palavra do título do destaque em âmbar (regra de exibição, sem campo novo).
4. Alternador "Disponível" na lista do painel: mesma ação `toggleProduct`, outro controle. Precisa de rótulo acessível e estado de carregamento.
5. Menu "⋯ Mais ações" na lista (desativar, subir, descer, excluir): mesmas ações, novo contêiner.
6. "Precisam de atenção" no resumo: nova consulta com campos (produtos com `is_available = false` **ou** `image_path` nulo, sem repetir o mesmo produto; quando os dois valem, mostrar as duas etiquetas). Mesmas tabelas e permissões; hoje o resumo só conta registros.
7. "Loja hoje" no resumo do desktop: lê `store_settings` (hoje o resumo não lê).
8. Esconder a barra inferior do painel em `/admin/produtos/novo` e `/admin/produtos/[id]`.
9. Vazio da busca com botão e atalhos de categoria: precisa buscar as categorias em `busca/page.tsx` e passá-las a `search-results.tsx`.
10. "Abre segunda às 08:00": formatar também o dia da semana de `opensNext` (fuso de São Paulo). Hoje o texto é "Abre às HH:MM".
11. Textos derivados que hoje não existem: "3 itens" por categoria, "10 produtos · 6 categorias" (no painel: **todos** os produtos cadastrados, ativos ou não) e "Sábado · hoje". São contas de apresentação, sem campo novo.
12. Vídeo e movimento reduzido: hoje o vídeo só começa após o toque, mas então usa `autoPlay` e `loop` sem consultar `prefers-reduced-motion`. A regra do vault (não tocar sozinho nesse caso) precisa ser implementada em `components/menu/media-video.tsx`.
13. Atalho "Novo destaque" do resumo leva a `/admin/destaques` (não existe `/admin/destaques/novo`).

**Não muda**: banco de dados, rotas, regras de acesso, envio de mídia.

## 8. Acessibilidade e desempenho

- Alvos de toque: botões 48 px; botões de ícone 44×44; abas 92×64; linhas de produto 80 px; campos 48 px. Elementos desenhados com menos de 44 px de altura precisam de área de toque estendida na implementação: chips de categoria (36 px), "Ver todos" (24 px), alternador (52×32), "⋯" (36×44) e, no desktop, ações da tabela (36×36, uso com mouse).
- Estados nunca dependem só de cor: sempre há texto (Aberta/Fechada, INDISPONÍVEL, ATIVO) e, onde cabe, ícone.
- Cartão e linha inteiros são o link; a seta é decorativa (deve ficar fora da leitura de tela).
- Texto mínimo de 10 px, só em rótulos em caixa alta; corpo em 12–14 px.
- Vídeo: continua só no detalhe, sem som, com a foto como capa, sem tocar sozinho com movimento reduzido.
- Banner: a imagem do primeiro destaque é o maior elemento da primeira tela — manter `priority`. O brilho laranja é um degradê em CSS, sem imagem extra.
- Menos fontes: de 4 para 2 famílias.

## 9. Autocrítica (design-critique)

**Impressão geral:** a home ficou com a cara da referência e continua sendo Salgaê; o que mais chama atenção é o banner, o que é correto. O maior risco é a densidade da home em telas menores que 390×844.

| Achado | Gravidade | Recomendação |
| --- | --- | --- |
| Home cabe em 844 px com 14 px de folga; em aparelhos de 667 px a faixa do segundo destaque fica abaixo da dobra | moderada | aceitável (rola); testar em 360×640 na implementação |
| Com o aviso da loja ligado, a home fica com 7 blocos antes da barra | moderada | se pesar, mover o aviso para dentro do cartão de status em `/info` e mostrar só um ponto no status |
| Nome em 1 linha no cartão compacto corta nomes longos ("Coxinha de frango com…") | moderada | o nome completo aparece no detalhe e na lista do cardápio; alternativa: 2 linhas e cartão 18 px mais alto |
| Chips de 36 px e alternador de 32 px desenhados abaixo de 44 px | moderada | área de toque estendida (seção 8) |
| Etiqueta "DESTAQUE DA CASA" é fixa para todos os destaques | menor | manter; um campo de etiqueta por destaque seria funcionalidade nova |
| Tela 03: sobra espaço vazio entre o botão e a barra em descrições curtas | menor | aceitável; a folha cresce com descrições longas |
| Tela 10: metade inferior vazia no desktop | menor | aceitável para um resumo pequeno |
| Selo sobre a ilustração no cartão compacto cobre parte da imagem | menor | com foto real ocupa o canto; manter |

**O que funciona:** logo centralizada sem perder o status da loja; lista vertical no cardápio (mais itens por tela, preço alinhado); verde/perigo deixam aberta/fechada e disponível/indisponível inequívocos; mesma estrutura de cabeçalho no cardápio e no painel.

## 10. Limitações desta entrega

- **Limite do Figma:** a conta está no plano Starter com assento "View". O conector do Figma parou de aceitar chamadas no fim do trabalho, com a mensagem `You've reached the Figma MCP tool call limit on the Starter plan`. Consequências:
  - A tela **12** ficou com um defeito no arquivo: o bloco "Categoria" está com altura fixa e sobrepõe a descrição. Correção manual em 10 segundos: selecionar `grupo/Categoria` e o cartão `dados do produto` e pôr o redimensionamento vertical em "Hug". O PNG `12-painel-desktop-edicao.png` é a captura anterior a essa tentativa de ajuste (nela o último chip de categoria encosta na borda do cartão).
  - Os PNG são as capturas feitas pelo Figma durante a montagem, em 1× (celular 390×844; desktop em 1152×720 e 1008×630), não uma exportação final em 2×. O arquivo do Figma tem a qualidade total.
  - Capturas anteriores a pequenos ajustes que já estão no arquivo: `04` e `04b` (anel de foco da busca mais suave no Figma), `07` (texto "Visíveis, com aviso" e cartões de mesma altura no Figma). Em `01`, o fundo do item ativo da barra foi corrigido na imagem para igualar o arquivo.
- **Fotos:** a homologação não tem fotos de produto (todas usam o marcador listrado). As telas usam **ilustrações** no estilo da coxinha do logo, no lugar das fotos reais. O conector oferece geração de imagem por IA, mas ela consome créditos pagos da conta e por isso não foi usada.
- Há uma sétima categoria de exemplo ("Sucos") fora da área visível da tela 01; ignorar.
- O Figma gratuito aceita 3 páginas; os componentes ficaram na primeira.

## 11. Perguntas para o responsável

1. **Lado esquerdo do cabeçalho:** status da loja (proposta) ou ícone de menu como na referência (exigiria criar um menu lateral)?
2. **Título do banner:** pode sair a Anton e entrar a Poppins em duas cores (revê a decisão de 08/10)?
3. **Verde da marca** para "Aberta", "Disponível" e selo NOVO: aprova?
4. **Banner escuro** (referência) ou manter o banner laranja atual?
5. **Cardápio em lista vertical** em vez de carrosséis por categoria: aprova?
6. **Barra inferior sem botão central:** confirma, enquanto não houver pedido pela mesa?
7. **Fotos reais:** haverá fotos dos produtos antes do desenvolvimento? O resultado depende muito delas.
8. **Painel:** pode esconder a barra inferior durante a edição de produto e criar a lista "Precisam de atenção"?

## 12. Validação cruzada (Codex)

Chamada: `codex-companion.mjs task --model gpt-5.6-terra --effort medium --write` (o cabeçalho do arquivo de resposta diz "GPT-5, esforço alto"; vale o que foi pedido na chamada). Resposta completa em `docs/design/refatoracao/validacao-codex.md`.

**Veredito: APROVADA COM RESSALVAS.** Nenhuma migração, regra de acesso ou rota nova é necessária; nada contradiz o escopo de consulta.

| # | Ressalva do Codex | Procede? | O que foi feito |
| --- | --- | --- | --- |
| 1 | "Abre segunda às 08:00" não é produzido hoje (só a hora) | sim | Registrado na tela 05b e como item 10 da seção 7. O texto do desenho **não pôde ser trocado** por causa do limite do Figma |
| 2 | Cabeçalho compartilhado pede mudar a home e criar componente/layout | sim | Seção 7 passou a citar `public-header.tsx`, `(listas)/layout.tsx` e a home; ficou explícito que o detalhe não recebe o cabeçalho |
| 3 | Chip ativo exige ilha de cliente | sim | Item 1 reescrito, com o comportamento sem JavaScript |
| 4 | "Precisam de atenção" e "Loja hoje" são consultas novas | sim (já estavam como comportamento novo) | Item 6 ganhou a regra de não repetir produto |
| 5 | Esconder a barra muda o `AdminShell` | sim | Citado na lista de arquivos |
| 6 | Vazio da busca precisa das categorias | sim (já estava) | Item 9 detalhado |
| 7 | Contagens e "· hoje" são derivados | sim | Item 11; definido que "10 produtos" conta todos os cadastrados |
| 8 | Tokens verdes/suaves não existem hoje | sim | Texto da seção 2 corrigido: são tokens a criar |
| 9 | Vídeo não respeita movimento reduzido hoje | sim | Item 12 |
| — | Não existe `/admin/destaques/novo` | sim | Item 13: o atalho leva a `/admin/destaques` |

Nenhuma ressalva foi recusada. O desenho só não foi ajustado no ponto 1 porque o Figma bloqueou novas chamadas (seção 10).

## 13. Revisão 2 (2026-10-11) — cards em faixa horizontal

Pedido do responsável depois de ver as telas. **Substitui** a lista vertical da tela 02 (seção 4) e o cartão compacto de 148 px da tela 01. A pergunta 5 da seção 11 fica respondida: o cardápio **não** vira lista vertical.

- **Tela 02 — Cardápio:** cada categoria é uma faixa de cards com rolagem horizontal, no lugar das linhas.
- **Corte na metade:** cabem 2 cards inteiros e metade do terceiro. No fim da rolagem a metade cortada passa para a esquerda. Largura do card = (largura da tela − 16 − 2 × 12) ÷ 2,5 → 140 px em 390 px. Encaixe por card (`scroll-snap`, alinhado ao início, com 16 px de margem).
- **Tamanho do card** (referência nova, cardápio do KFC): card em pé, 140 × 242 px. Foto de 108 px, nome em até 2 linhas, descrição em até 2 linhas, preço e seta na base. Antes: 148 × 170 px, com nome e descrição em 1 linha.
- **Tela 01 — "Mais pedidos"** usa o mesmo card.
- Fora, como na revisão 1: coração de favorito, estrelas, botão "+" e desconto da referência.

Consequências a conhecer:
- Categoria com 1 ou 2 produtos não tem card cortado (não há terceiro para cortar).
- Na tela 01 a faixa "Combo do dia" desce para depois da primeira tela (o card ficou 72 px mais alto).
- O código atual já tem a faixa de 2,5 cards (`components/menu/product-row.tsx` e `ProductCard compact`); na fase 2 muda a aparência do card, não o mecanismo.

Arquivos: protótipo em `docs/design/refatoracao/prototipo-v2/` (abrir `index.html?tela=inicio` ou `?tela=cardapio`; `&rolado=1` mostra o fim da rolagem). Imagens em `telas/`: `01-inicio-v2.png`, `01b-inicio-v2-fim-da-rolagem.png`, `02-cardapio-v2.png`, `02b-cardapio-v2-fim-da-rolagem.png` (390 × 844 em 2×). **O arquivo do Figma não foi atualizado** (limite de chamadas do plano Starter, seção 10); as telas 01 e 02 de lá estão na versão anterior.

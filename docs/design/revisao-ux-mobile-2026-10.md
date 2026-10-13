# Revisão de design e uso no celular — cardápio e painel (outubro de 2026)

Data: 2026-10-12 · Feita pelo agente de design e UX mobile · **Só leitura**: nenhum código foi alterado, nada foi salvo no painel.

**Como foi feita**

- Cardápio no ar em homologação (`salgae-homologacao.vercel.app`), aberto no navegador em 390×844 (celular comum) e 360×640 (celular pequeno): Início, Cardápio, Busca (com resultado e sem), Info, detalhe de produto disponível e indisponível. Medi tamanhos de botão, posição na tela e contraste.
- Painel por dentro, na sessão do responsável, **sem tocar em nenhum botão de ação**: Resumo, Produtos, edição de um produto com foto e vídeo, e "Novo produto" (só aberto). Categorias, Destaques e Loja foram avaliadas pelo código (ver seção 6).
- Redesign aprovado: `docs/design/refatoracao/especificacao.md` (incluindo a seção 13, cards em faixa) e as imagens em `telas/`. Também li o código que já está sendo escrito para ele, para saber o que de fato vai mudar.
- Gravidade: alta = atrapalha a tarefa ou mostra informação errada · média = dá trabalho ou confunde · baixa = acabamento. Esforço: P = horas · M = 1 a 2 dias · G = mais que isso.

---

## 1. Resumo em 5 linhas

1. O cardápio de hoje funciona, mas no celular desperdiça a primeira tela (cabeçalho de 111 px, nenhum preço visível antes de rolar), só a seta do card abre o produto e o botão do banner aparece cortado. **O redesign aprovado resolve a maior parte disso.**
2. O que o redesign **não** resolve no cardápio: o aviso "Aberta/Fechada" pode aparecer errado (vi "Aberta" às 23h15 de segunda), o "voltar" do produto joga a pessoa para o topo do cardápio e a busca esquece o que foi digitado.
3. O painel é onde há mais a ganhar: formulário de produto com 3,4 telas de altura, vídeo escondido 2,3 telas abaixo e só liberado depois de salvar, e erros que não aparecem no celular.
4. Três telas do painel não foram desenhadas para celular (Categorias, Destaques, Loja) e têm problemas sérios: o editor abre fora da tela e a tabela de horários não cabe na largura.
5. **As 3 melhorias de maior efeito:** (a) cadastrar produto com foto e vídeo de uma vez, com progresso claro; (b) status da loja sempre certo + voltar para o mesmo lugar no cardápio; (c) refazer Categorias, Destaques e Loja para celular, com avisos visíveis de "salvou / deu erro".

---

## 2. Cardápio do cliente

| # | Tela | O que acontece hoje | Por que atrapalha no celular | Sugestão concreta | Grav. | Esf. | Situação |
|---|---|---|---|---|---|---|---|
| C1 | Início | O topo tem 4 linhas empilhadas (saudação, logo, "SALGADOS QUENTES", "Aberta") e ocupa 111 px. A logo tem 71×40 px, mas a arte visível mede uns 44×25 px. | A marca quase não aparece e empurra tudo para baixo. | Cabeçalho de 68 px com a logo no centro (44 px de altura visível). | média | M | o redesign aprovado já resolve |
| C2 | Início e Info | Às 23h15 de segunda a Início mostrava **"Aberta"** (a loja fecha às 18h). A tela Info, no mesmo minuto, mostrava "Fechada". Recarregando, a Início corrigiu. | O cliente lê uma informação errada sobre a loja. No redesign esse aviso passa a aparecer no topo de **todas** as telas, então o erro fica mais visível. | Calcular "Aberta/Fechada" no celular do cliente, na hora em que a tela abre, a partir dos horários cadastrados. | **alta** | P/M | NOVO — não está no redesign |
| C3 | Início | O banner tem altura fixa de 208 px e o botão "Conferir" (105×36 px) passa 8 px da borda: aparece cortado embaixo. Só o botão é clicável. | Parece defeito logo na primeira tela; o alvo de toque é pequeno para a área que o banner ocupa. | Banner inteiro clicável (já previsto) **e** altura que cresce com o texto, com título limitado a 2 linhas. | média | P | o redesign resolve em parte (ver R1 na seção 5) |
| C4 | Início | Em 390×844 os cards de "Mais pedidos" começam em y≈640 e a barra inferior cobre a partir de 780: vê-se foto e nome, **nenhum preço**. Em 360×640 o título "Mais pedidos" já nasce atrás da barra (y=592, barra em 576). | Quem abre o cardápio quer ver comida e preço sem rolar. | No redesign cabem 2 cards com preço em 390×844. Em tela baixa (menos de 700 px de altura), encolher o banner para ~150 px e esconder a frase do banner. | média | P | o redesign resolve em parte |
| C5 | Início, Cardápio, Busca | No card (140×245 px) só a bolinha da seta (44×44 px) abre o produto. Tocar na foto, no nome ou no preço não faz nada. | A pessoa toca na foto, nada acontece, e acha que travou. | Card inteiro como botão. | **alta** | P | o redesign aprovado já resolve |
| C6 | Todas | Sem foto, o card mostra um quadro escuro listrado com o nome em letra de máquina. Em homologação, 10 dos 11 produtos estão assim. | O cardápio fica escuro e repetitivo; comida vende pela foto. | Marcador claro (já previsto) e, principalmente, **fotografar os produtos** antes de mostrar a clientes. | **alta** | P (código) | o redesign resolve em parte (depende das fotos reais) |
| C7 | Início | Na barra inferior nenhuma aba fica marcada quando se está na Início (as 4 ficam cinza). Nas outras telas marca certo. | A pessoa não sabe em que tela está. | Aba ativa em pílula. | baixa | P | o redesign aprovado já resolve |
| C8 | Cardápio | Os botões de categoria no topo têm 34 px de altura e nenhum fica marcado conforme a rolagem. | Alvo pequeno; não dá para saber em que categoria se está. | Botão marcado conforme a rolagem e área de toque de 44 px. | média | M | o redesign aprovado já resolve |
| C9 | Cardápio | 6 categorias e 11 produtos ocupam 2.183 px (2,6 telas). Cada categoria gasta 293 px mesmo tendo 1 item (Porções, Combos e Doces): um card sozinho e 60% da linha vazia. | Muita rolagem para pouco conteúdo. | Juntar na mesma faixa as categorias vizinhas que têm 1 item só, ou mostrar o card único deitado (foto à esquerda, texto à direita, ~96 px de altura). | média | M | NOVO — não está no redesign (a revisão 2 mantém uma faixa de 242 px por categoria) |
| C10 | Cardápio | O 3º item em diante de cada categoria fica escondido na rolagem lateral (em Coxinhas, a "Coixinha de Carne" só aparece arrastando). Produto indisponível fica no meio da faixa, na ordem cadastrada. | O que não pode ser pedido ocupa lugar de vitrine; o que pode fica escondido. | Mandar os indisponíveis para o fim de cada faixa automaticamente. O contador "4 itens" (já previsto) ajuda a avisar que há mais. | média | P | NOVO — não está no redesign |
| C11 | Detalhe | O botão de tocar o vídeo é um círculo escuro de 56 px sobre a foto, que também é escura: quase não se vê. | O vídeo, que deu trabalho para gravar, passa despercebido. | Botão branco e etiqueta "VÍDEO CURTO · SEM SOM". | média | P | o redesign aprovado já resolve |
| C12 | Detalhe | "Disponível para consulta" e "Indisponível no momento" usam quase a mesma cor (marrom sobre rosa). | Dois avisos opostos com a mesma cara; o "disponível" parece alerta. | Verde para disponível, vermelho-terra para indisponível, com ícone. | média | P | o redesign aprovado já resolve |
| C13 | Detalhe | Os dois botões de voltar (seta no topo, 44×44 px, e "Voltar ao cardápio", 159×44 px) levam sempre ao **topo** do cardápio. | Quem veio da Busca ou da Início cai em outra tela; quem estava em "Doces", lá embaixo, volta para "Coxinhas" e precisa rolar tudo de novo. | Voltar para a tela e a posição de onde a pessoa veio. Texto do botão: "Voltar". | **alta** | P | NOVO — não está no redesign |
| C14 | Detalhe | Em 360×640 o botão "Voltar ao cardápio" fica em y=591–635, atrás da barra inferior (576). No redesign a foto cresce para 340 px, então ele desce mais. | O único botão da tela nasce escondido. | Altura da foto proporcional à tela (no máximo 40% da altura) em vez de 340 px fixos. | média | P | o redesign resolve em parte (piora em tela pequena) |
| C15 | Detalhe | Depois de ler o produto, só resta voltar. No desenho aprovado sobra espaço vazio entre o botão e a barra. | Ver três coxinhas exige ir e voltar três vezes. | Faixa "Mais de Coxinhas" com os outros itens da mesma categoria, usando o mesmo card. | média | M | NOVO — não está no redesign |
| C16 | Busca | O que foi digitado não fica guardado. Abrir um resultado e voltar pelo botão do celular zera a busca. | A pessoa precisa digitar de novo a cada produto que olha. | Guardar o termo junto com o endereço da tela, para o "voltar" trazer a busca como estava. | média | P | NOVO — não está no redesign |
| C17 | Busca | A busca só olha nome e descrição. "doce" ou "bebida" não encontram os itens dessas categorias. | O cliente busca pelo tipo do que quer e recebe "Nada por aqui". | Incluir o nome da categoria na busca e mostrar a categoria encontrada como primeiro atalho. | média | P | NOVO — não está no redesign |
| C18 | Busca | Ao entrar, o teclado abre sozinho e a tela lista os 11 produtos em grade (2.055 px), repetindo o cardápio. | Com o teclado aberto sobra menos de um card visível; a lista repete o que a aba Cardápio já mostra. | Antes de digitar, mostrar atalhos de categoria e os mais pedidos. Abrir o teclado sozinho só quando a pessoa tocou no campo de busca da Início. | baixa | P | NOVO — não está no redesign |
| C19 | Busca sem resultado | Só o texto "Nada por aqui". Nenhum botão. | Beco sem saída. | Botão "Ver cardápio completo" e atalhos de categoria. | média | P | o redesign aprovado já resolve |
| C20 | Info | Só status e horários. "Abre às 08:00" não diz o dia. "Fechada" em marrom parecido com o "Aberta". | Em sábado à noite, "Abre às 08:00" engana (domingo é fechado). | Verde/vermelho-terra, dia da semana ("Abre segunda às 08:00"), endereço e contatos. | média | M | o redesign aprovado já resolve |
| C21 | Todas | Letras de 8 px (assinatura e selos), 9 px e 10 px (status e abas). | Difícil de ler de pé no balcão, com o celular na mão. | Mínimo de 10 px só em etiquetas em caixa alta; abas com 11 px. | média | P | o redesign aprovado já resolve |
| C22 | Todas | Cards e botões não mudam de aparência ao serem tocados. | Na internet da loja, entre o toque e a troca de tela não há sinal de que o toque valeu; a pessoa toca de novo. | Leve "afundar" (escurecer ou encolher 2%) no toque. | baixa | P | NOVO — não está no redesign |
| C23 | Todas | O contorno que mostra o item selecionado pelo teclado é laranja a 20% sobre creme: quase invisível. | Afeta quem navega por teclado ou leitor de tela (no painel pelo computador também). | Contorno mais forte (laranja pleno ou tinta, 2 px). | baixa | P | NOVO — não está no redesign |

**O que já está bom e deve ficar:** contraste de todos os textos medidos está acima do mínimo (preço e "Ver todos" laranja: 4,9; textos cinza: 5,8 a 6,3); barra inferior com alvos de 98×64 px; campo de busca com letra de 16 px (não dá zoom no iPhone); selo e etiqueta sempre com texto, nunca só cor; página em português declarada corretamente.

**Para o desenvolvimento:**

- C2: as páginas usam `revalidate = 60` e calculam `getStoreStatus(settings, new Date())` no servidor, na hora em que a página é gerada. A primeira visita depois de um período sem acesso recebe a página antiga, com o status de horas atrás. O novo `app/(public)/(listas)/layout.tsx` faz o mesmo. Solução: uma ilha de cliente pequena que recebe `opening_hours` e `status_override` e calcula no navegador (com revisão a cada minuto), ou tirar o status do cache.
- C3: `highlight-banner.tsx` em andamento usa `h-[196px]` com `p-4`; etiqueta + título em 2 linhas + descrição em 2 linhas + botão somam ~193 px. Um título cuja primeira parte quebre em duas linhas corta o botão. Usar `min-h` e `line-clamp-2` no título.
- C9/C10: ordenar por `is_available` antes de `sort_order` na montagem de cada faixa em `cardapio/page.tsx` (regra de apresentação, sem campo novo).
- C13: os dois `Link href="/cardapio"` em `app/(public)/produto/[id]/page.tsx` continuam assim no código em andamento. Trocar por um botão de cliente que usa `history.back()` quando a página anterior é do próprio site, com `/cardapio#slug-da-categoria` como reserva.
- C16: `search-results.tsx` usa `useState('')`; testei `/busca?q=coxinha` e o campo veio vazio. Sincronizar com `?q=` via `router.replace`.
- C17: `filterMenuProducts` em `lib/menu/search.ts` concatena só `name` e `description`.
- C20: no `info/page.tsx` em andamento o título "Endereço e contato" aparece mesmo sem nenhum dado cadastrado (é o caso da homologação hoje). Esconder a seção inteira quando estiver vazia.
- C21: `product-card.tsx` em andamento usa `text-[9px]` nos selos; a especificação pede mínimo de 10 px.
- Estrutura de títulos: cada slide do banner e cada categoria é um `h1`. Deixar um `h1` por página e o resto como `h2`.
- Barra inferior nova: `h-[72px]` junto com `pb-[env(safe-area-inset-bottom)]` espreme o conteúdo se a área segura for usada um dia (app instalado na tela inicial). Usar altura mínima em vez de fixa.

---

## 3. Painel

Vi por dentro: Resumo, Produtos, edição de produto e "Novo produto". Categorias, Destaques e Loja: pelo código (marcado na tabela).

| # | Tela | O que acontece hoje | Por que atrapalha no celular | Sugestão concreta | Grav. | Esf. | Situação |
|---|---|---|---|---|---|---|---|
| A1 | Login | Sem logo. Texto "Entre com as credenciais fornecidas pela administração". Não há como ver a senha digitada. Campos de 316×50 px e botão de 48 px (bons). | Senha digitada no celular erra fácil; a mensagem de erro é genérica e não ajuda a achar o erro. | Logo e texto simples (já previstos) + botão de "olho" para mostrar a senha + link "Voltar ao cardápio". | baixa | P | o redesign resolve em parte (olho e link são novos) |
| A2 | Todas | O topo "ADMINISTRAÇÃO · Olá, Manuel 👋 · Sair" ocupa 88 px em toda tela. Em Produtos não há título dizendo em que tela se está. | Gasta 10% da tela com um cumprimento e não orienta. | Cabeçalho com logo, status da loja e sair; título da tela logo abaixo. | média | M | o redesign aprovado já resolve |
| A3 | Todas | Na barra inferior os ícones são símbolos de texto (◼ ◫ ◇ ✦ ⌂), a letra tem 10 px e a primeira aba se chama "Dashboard". Alvos de 76×48 px. | Símbolos não dizem nada; palavra em inglês. | Ícones de verdade, "Resumo", letra de 11 px. | média | P | o redesign aprovado já resolve |
| A4 | Resumo | Os 4 números ficam empilhados (153 px cada, 612 px no total). O botão "Novo produto" nasce em y=847, **abaixo da primeira tela**. "Sem foto: 10" não diz quais são. Textos como "Usam o fallback até receber mídia". | A ação mais usada exige rolar; os números não levam a lugar nenhum. | Números em grade 2×2, botões na primeira tela e lista "Precisam de atenção" (já previstos). Além disso: tocar em "Indisponíveis" ou "Sem foto" abre a lista já filtrada. | média | M | o redesign resolve em parte (número tocável é novo) |
| A5 | Produtos | Cada produto ocupa 240 px; os 11 somam 3.233 px (quase 4 telas). São 5 botões de 50 px em duas linhas; "Excluir" fica a 8 px do "↓". | Cabem 2 produtos por tela; achar um item é rolar muito; excluir fica colado em um botão de uso comum. | Cartão compacto com alternador e menu "⋯". | **alta** | M | o redesign aprovado já resolve |
| A6 | Produtos | Para editar é preciso tocar **no nome** do produto: um texto de 90×23 px. Não há botão "Editar"; a foto não é clicável. | Alvo com metade do tamanho mínimo e sem cara de botão. Quem não sabe, não descobre. | Cartão inteiro abre a edição (menos o alternador e o "⋯"), com uma setinha à direita indicando. | **alta** | P | o redesign resolve em parte (o desenho não diz por onde se entra na edição) |
| A7 | Produtos | O botão mostra a **ação**, não a situação: um produto ATIVO tem um botão escrito "Indisponível". | Lê-se como "este produto está indisponível". | Alternador "Disponível" ligado/desligado. | **alta** | P | o redesign aprovado já resolve |
| A8 | Produtos, Categorias, Destaques | Quando uma ação rápida falha (disponível, ativar, subir, descer), o erro só aparece como dica ao passar o mouse. No celular isso não existe. Também não há aviso quando dá certo. | A pessoa toca, nada muda e ela não sabe se foi a internet, um erro, ou se já valeu. | Aviso curto na base da tela ("Risole marcado como indisponível" / "Não deu para salvar. Tente de novo"), por 4 segundos. | **alta** | P | NOVO — não está no redesign |
| A9 | Produtos | A lista mistura as categorias (Batata frita, Brigadeiro, Combo, Coxinha…) em vez de seguir a ordem do cardápio. As setas ↑ ↓ mexem só dentro da categoria e andam uma posição por toque. | Tocar em "↑" muitas vezes não muda nada na tela; levar um item do 5º para o 1º lugar são 4 toques com espera entre eles. | Agrupar a lista por categoria, na ordem do cardápio, e criar um modo "Organizar ordem" por categoria: setas sempre à vista (ou arrastar) e um único "Salvar ordem". | média | M | NOVO — não está no redesign (o desenho esconde subir/descer dentro do "⋯", o que piora) |
| A10 | Produtos | Filtro só por nome e por categoria (lista suspensa). A busca por nome não ignora acento ("pasteis" não acha "Pastéis"). Não dá para ver só os indisponíveis ou só os sem foto. | Com 10 de 11 produtos sem foto, não há como listar o que falta fazer. | Categorias em botões (já previsto) + botões de situação: "Indisponíveis", "Sem foto", "Desativados". Busca que ignora acento. | média | P | o redesign resolve em parte (filtro de situação é novo) |
| A11 | Edição de produto | O formulário tem 2.879 px (3,4 telas). Duas barras fixas embaixo, "Salvar" (73 px) e navegação (59 px), tomam 132 px: 16% da tela. "Foto e vídeo" começa em y≈1.100; "Escolher foto" está em y=1.571 e "Escolher vídeo" em y=1.933, 2,3 telas abaixo do começo. | A parte mais importante para vender (foto e vídeo) é a mais difícil de alcançar. | Foto e vídeo no topo, lado a lado; barra de navegação some nesta tela. | **alta** | M | o redesign aprovado já resolve |
| A12 | Edição de produto | No fim (y=2.089) há uma "Prévia no cardápio" de 526 px com foto de 356×310 px, bem maior que o card real (140×242). A seta da prévia é um link de verdade: tocar nela sai da tela. | A prévia não parece com o que o cliente vê e pode fazer perder o que foi digitado. | No celular, tirar a prévia e deixar o botão "ver no cardápio" (olho) no topo, como no desenho. | média | P | o redesign aprovado já resolve (confirmar que a prévia sai do celular) |
| A13 | Edição de produto | Textos escritos para programador: "Cadastre em uma coluna no celular", "Ela será convertida em WebP", "MP4, MOV ou WebM", "A foto continua sendo a capa e o fallback". | O dono da loja não precisa (nem entende) esses termos. | "Tire a foto na hora ou escolha da galeria. Vídeo é opcional: até 15 segundos." | baixa | P | o redesign resolve em parte (ver R9: o desenho diz 10 MB, o sistema aceita 50 MB) |
| A14 | Edição de produto | "Produto ativo" e "Disponível agora" são duas caixinhas de marcar de 13×13 px, uma embaixo da outra, sem explicação. | Parecem a mesma coisa. Qual esconde do cardápio? Qual só avisa que acabou? | Um controle só com três posições: **No cardápio** · **Em falta hoje** (aparece com aviso) · **Escondido** (não aparece). | média | M | o redesign resolve em parte (vira alternador, mas continuam dois; ver R6) |
| A15 | Novo produto | O bloco de vídeo fica no fim do formulário, depois de ~1.900 px, e mostra só "Nenhum vídeo enviado." e a frase "Salve o produto e a foto primeiro para adicionar vídeo." Sem botão. Depois de criar, a tela vira "Editar produto" e volta ao topo; o aviso "Produto criado com sucesso" fica lá embaixo, depois de Foto e vídeo, e o botão de vídeo a 2,3 telas dali. | **Foi o que confundiu o responsável:** não há sinal de que o vídeo "apareceu", nem de que o produto foi criado. | Escolher foto **e** vídeo já na criação, no topo. Ao tocar "Criar produto", mostrar o andamento em três passos: "1. Salvando o produto · 2. Enviando a foto · 3. Enviando o vídeo". Detalhes em R8. | **alta** | M | NOVO — não está no redesign (a tela "Novo produto" não foi desenhada) |
| A16 | Novo produto | Depois de tocar "Criar produto", o botão volta a ficar ativo enquanto a foto ainda está subindo. Um segundo toque nessa hora pode criar o produto duas vezes. *(Lido no código; não testei para não criar dados.)* | Produto duplicado no cardápio. | Manter o botão travado, escrito "Enviando a foto…", até a tela trocar. | **alta** | P | NOVO — não está no redesign |
| A17 | Edição de produto | O botão "Salvar" é fixo, mas a mensagem "salvou" ou "deu erro" aparece dentro do formulário, depois de Foto e vídeo (y≈2.050). "Voltar" sai sem avisar que há mudança não salva. | Quem muda o preço lá em cima e salva não vê confirmação nenhuma. | Aviso colado acima do botão ("Alterações salvas") e botão que vira "Salvo ✓" por 2 segundos. Ao sair com mudança pendente: "Sair sem salvar?". | média | P | NOVO — não está no redesign |
| A18 | Edição de produto (vídeo) | "Escolher vídeo" fica ativo mesmo sem foto; o sistema só recusa depois de conferir o arquivo ("Salve uma foto de capa antes de enviar o vídeo"). Durante a compactação a barra para em 95% por até um minuto com "Não feche esta tela". | A pessoa escolhe o vídeo, espera e só então descobre que faltava a foto. | Sem foto: quadro de vídeo apagado com a frase "Escolha a foto primeiro". Na compactação, trocar a porcentagem parada por um indicador girando e "Quase lá: preparando o vídeo (até 1 minuto)". | média | P | NOVO — não está no redesign |
| A19 | Categorias *(código)* | No celular a lista vem primeiro e o formulário fica **no fim da página**. Tocar em "Editar" preenche esse formulário lá embaixo e a tela não se mexe. Há um campo "Slug" com a explicação "é usado nas URLs". | Parece que "Editar" não funcionou. "Slug" não é palavra de lanchonete. | "Editar" e "Nova categoria" abrem uma folha que sobe de baixo, com Nome, Descrição e Ativa. O endereço da categoria é criado sozinho a partir do nome e fica escondido em "Avançado". | **alta** | M | NOVO — não está no redesign (tela não desenhada para celular) |
| A20 | Destaques *(código)* | Mesmo problema do editor no fim da página. Além disso a barra fixa "Criar destaque" fica sempre na tela, mesmo quando se está só olhando a lista. O campo "Destino" pede "/cardapio ou https://…". | Botão de salvar sem formulário à vista; o dono não sabe o que é uma "rota interna". | Editor em folha (igual a Categorias). "Destino" vira a pergunta **"Para onde o banner leva?"** com opções: Cardápio inteiro · Uma categoria · Um produto · Outro link. | **alta** | M | NOVO — não está no redesign (tela não desenhada para celular) |
| A21 | Loja *(código)* | A tabela de horários tem largura mínima de 600 px numa tela de 390 px (área útil ~310 px): é preciso arrastar para o lado para ver a coluna "Fecha". O botão "Salvar" fica só no fim e não é fixo. Telefone com exemplo "5585…". | Preencher 7 dias arrastando para os lados é o tipo de tarefa que se desiste de fazer no celular. | Uma linha por dia: nome do dia, alternador "Aberto" e dois campos de hora lado a lado; botão "Copiar para todos os dias". Salvar fixo embaixo. Exemplo de telefone "(85) 99999-0000". | **alta** | M | NOVO — não está no redesign (tela não desenhada para celular) |
| A22 | Loja *(código)* | Para fechar a loja agora (acabou a massa, faltou luz) é preciso: aba Loja → rolar até "Status temporário" → escolher na lista → rolar até o fim → Salvar. | É a ação mais urgente do painel e a mais escondida. | Tocar na pílula "Aberta/Fechada" do topo do painel abre três opções: **Seguir os horários** · **Fechar agora** · **Abrir agora**. Dois toques. | média | M | NOVO — não está no redesign |
| A23 | Excluir e Sair | O aviso de confirmação diz "Ação irreversível" e "Excluir de vez" até para "Remover foto". O botão "Sair" (70×50 px, canto de cima) sai na hora, sem perguntar. | Texto assusta mais do que deve; um toque errado em "Sair" perde o que estava sendo digitado. | Botão do aviso com o nome da ação ("Remover foto"). "Sair" pergunta antes se houver formulário com mudança. | baixa | P | NOVO — não está no redesign |

**O que já está bom e deve ficar:** botões e campos com 44 a 50 px de altura; letra de 16 px nos campos (não dá zoom no iPhone); categoria e selo como botões (não lista suspensa) no formulário, quebrando em linhas; "Salvar" fixo no rodapé da edição; aviso de confirmação antes de excluir, com "Cancelar" em foco; foto reduzida no próprio celular antes de enviar.

**Para o desenvolvimento:**

- A6: em `products-manager.tsx`, `ProductMobileCard` só tem `<Link>` em volta do nome.
- A8: os três `QuickAction` (`products-manager.tsx`, `category-manager.tsx`, `highlights-manager.tsx`) jogam `state.message` no atributo `title` do botão. Criar um componente de aviso (`role="status"` / `role="alert"`) compartilhado.
- A9: a lista do painel vem ordenada por `sort_order` global; `reorderProduct` recebe `category_id`.
- A10: `ProductsManager` filtra com `toLocaleLowerCase().includes()`; reaproveitar `normalizeMenuSearch` de `lib/menu/search.ts`.
- A15/A16: em `product-form.tsx`, o `useEffect` de criação envia a imagem depois que `useFormStatus().pending` já voltou a `false`; o `SaveButton` fica habilitado nesse intervalo. `ProductMediaManager` só mostra o seletor de vídeo quando `productId` existe. O aviso `created` é renderizado depois de `<ProductMediaManager />`.
- A17: `state.message` é renderizado no fim do `<Card>`; a barra fixa fica fora dele.
- A18: `createProductVideoUpload` recusa quando `image_path` é nulo; o cliente já tem `hasImage` para desabilitar antes.
- A19/A20: `CategoryManager` e `HighlightsManager` usam uma grade de duas colunas só a partir de `xl`; abaixo disso o editor é o último filho. Em `HighlightEditor` a barra `fixed … sm:hidden` do salvar é sempre renderizada.
- A21: `store-settings-form.tsx` usa `<table className="w-full min-w-150">` dentro de `overflow-x-auto`.
- A22: usa o campo `status_override` que já existe (`auto` / `open` / `closed`); é só uma ação nova que grava esse campo.

---

## 4. Melhorias novas recomendadas (as "NOVO" e "em parte"), em ordem de prioridade

| # | Melhoria | Benefício | Mexe em | Grav. | Esf. | Achados |
|---|---|---|---|---|---|---|
| 1 | **Produto com foto e vídeo num passo só**, com andamento em três etapas e botão travado até terminar | Quem cadastra não precisa adivinhar que o vídeo "aparece depois", e não cria produto em dobro. | comportamento | alta | M | A15, A16, A18 |
| 2 | **"Aberta/Fechada" sempre certo**, calculado na hora em que a tela abre | O cliente nunca lê "Aberta" com a loja fechada. | comportamento | alta | P/M | C2 |
| 3 | **Voltar do produto para o mesmo lugar** (mesma tela, mesma categoria) e **busca que lembra** o que foi digitado | O cliente olha vários salgados sem rolar tudo de novo nem redigitar. | comportamento | alta | P | C13, C16 |
| 4 | **Avisos visíveis no painel**: "salvou", "deu erro", "sair sem salvar?" | Quem opera sabe na hora se a mudança valeu, mesmo com internet ruim. | comportamento | alta | P | A8, A17, A23 |
| 5 | **Horários da loja em uma linha por dia**, com "copiar para todos os dias" e Salvar fixo | Dá para ajustar o horário pelo celular sem arrastar a tela para os lados. | só aparência | alta | M | A21 |
| 6 | **Categorias e Destaques com editor em folha** que sobe de baixo; cartão de produto inteiro abre a edição | "Editar" passa a abrir algo na frente da pessoa, em vez de mexer num formulário fora da tela. | comportamento | alta | M | A19, A20, A6 |
| 7 | **Abrir ou fechar a loja em dois toques**, pela pílula do topo do painel | Faltou massa às 16h: fecha na hora, sem procurar a opção no meio de um formulário. | comportamento | média | M | A22 |
| 8 | **Banner que não corta o botão** e **Início que mostra preço em celular pequeno** | A primeira tela não parece quebrada e já mostra comida com preço. | só aparência | média | P | C3, C4, C14 |
| 9 | **Uma situação só por produto**: No cardápio · Em falta hoje · Escondido | Acaba a dúvida entre "ativo" e "disponível". | comportamento (mesmos dados) | média | M | A14 |
| 10 | **"Mais desta categoria" no detalhe** e **indisponíveis no fim de cada faixa**; busca que acha pelo nome da categoria | O cliente continua olhando sem voltar, e vê primeiro o que pode pedir. | comportamento | média | M | C15, C10, C17 |
| 11 | **Painel em português de balcão** e **"Para onde o banner leva?"** como escolha | O dono cadastra sem depender de quem programou. | aparência (textos) + comportamento (seletor) | média | P + M | A13, A19, A20 |
| 12 | **Organizar a ordem por categoria** e **filtros "Indisponíveis / Sem foto / Desativados"**, com os números do Resumo levando à lista filtrada | Arrumar a vitrine e achar o que falta fotografar vira tarefa de um minuto. | comportamento | média | M | A9, A10, A4 |

Fora desta lista, por serem acabamento rápido (P, só aparência): toque com resposta visual (C22), contorno de foco mais forte (C23), olho para mostrar a senha no login (A1), categorias de 1 item sem linha vazia (C9), tela inicial da busca com atalhos (C18).

---

## 5. Crítica ao próprio redesign aprovado

O conjunto é bom: a logo centralizada resolve o cabeçalho, o verde separa de vez aberta/fechada, o card inteiro clicável e o alternador no painel atacam os piores problemas de hoje. O que ainda pode melhorar no celular:

**Hierarquia**

- **R1 — Banner sem folga.** Na tela 01 v2 o botão "Conferir" já encosta na borda de baixo do banner (cerca de 2 px de folga). Um título um pouco mais longo corta o botão, que é exatamente o defeito de hoje. Deixar a altura crescer e limitar o título a 2 linhas. No painel, mostrar um contador no campo Título (por exemplo "18/24").
- **R2 — Três caminhos para a mesma tela.** No topo há a pílula "Aberta" (leva a Info) e o botão "i" (leva a Info), e na barra inferior a aba "Info". Na própria tela Info, o "i" leva para onde a pessoa já está e "Aberta" aparece duas vezes, a 60 px uma da outra. Sugestão: manter a pílula e trocar o "i" por algo que falta. Nas telas Cardápio e Info, uma lupa. Na Início e na Busca, que já têm o campo, deixar o lugar vazio.
- **R3 — Pontinhos do banner soltos no meio**, entre o texto e a imagem. Isso será refeito com o carrossel já aprovado; só garantir que fiquem embaixo, centralizados e com área de toque de 44 px.

**Densidade**

- **R4 — Celular pequeno.** Cabeçalho (68) + busca (48) + aviso (~44) + banner (196) + categorias (~90) somam ~480 px antes do primeiro card; em 360×640 sobram menos de 100 px acima da barra, e o card tem 242. Nenhum preço na primeira tela. A especificação já pede esse teste; a correção sugerida está em C4. O aviso da loja pode ir para dentro da pílula de status (um ponto âmbar e o texto ao tocar).
- **R5 — Cardápio longo com faixas.** Com o card de 242 px, cada categoria gasta ~310 px. Seis categorias são 1.900 px e a tela 02 v2 mostra "Porções — 1 item" com um card sozinho. Ver C9. A faixa lateral foi decisão do responsável e fica; a sugestão vale só para categorias de 1 item.

**Alcance do polegar**

- **R6 — Tela 08 (Produtos).** O botão "+ Novo" fica no canto de cima à direita (y≈90), logo abaixo do "Sair" (y≈60): é o ponto mais difícil de alcançar com uma mão e ainda vizinho de um botão que derruba a sessão. Sugestão: "+ Novo" flutuante acima da barra inferior, à direita.
- Na mesma tela, o Brigadeiro aparece como **DESATIVADO com o alternador ligado em "Disponível"**: duas informações que se contradizem lado a lado. É o argumento para a situação única (melhoria 9). O alternador também precisa dos estados "salvando" (apagado por um instante) e "não deu certo" (volta sozinho, com aviso).
- O menu "⋯" esconde subir/descer: mover um item 3 posições vira abrir menu → subir → abrir menu → subir → abrir menu → subir. Ver A9.
- No cardápio do cliente, busca e botões de categoria ficam no topo. É aceitável (padrão conhecido), mas os botões de categoria precisam continuar grudados no topo durante a rolagem.

**Legibilidade**

- Descrição do card: 12 px, cinza, em 140 px de largura. Cabem cerca de 20 letras por linha, em 2 linhas. Bom para "Frango cremoso em massa crocante", curto para descrições reais. Orientar no painel: "até 40 letras aparecem no card".
- Etiquetas de 10 px em caixa alta só funcionam com o espaçamento entre letras do desenho; não deixar a implementação encolher para 9 px (já aconteceu no card, ver nota em C21).
- Rótulo "Disponível / Indisponível" embaixo do alternador na tela 08: letra pequena e cinza para a informação mais importante da linha.

**Estados que faltam desenhar**

- Cliente: carregando (o esqueleto atual ainda tem o formato do cabeçalho antigo), erro ao carregar (hoje é só texto: falta um botão "Tentar de novo"), categoria sem itens, Info sem endereço nem contato.
- Painel: lista de produtos vazia (primeiro acesso), busca do painel sem resultado, salvando, salvou, erro ao salvar, sem internet, foto recusada (menor que 400 px ou maior que 15 MB), vídeo em envio, vídeo em compactação, vídeo recusado, sessão expirada no meio da edição.
- Telas inteiras sem desenho para celular: **Novo produto**, **Categorias**, **Destaques**, **Loja**, o menu "⋯" aberto e o aviso de exclusão.

**Formulário longo (tela 09)**

- **R7 — Botões de categoria em faixa lateral escondem opções.** No desenho, "Combos" aparece cortado e há mais depois. Num formulário, opção escondida é opção esquecida. Manter como está hoje: quebrando em linhas. O mesmo vale para os selos ("Quentinho" encosta na borda).
- O desenho cabe em uma tela com 6 categorias e descrição de 2 linhas. Com 10 categorias e descrição longa volta a ter 1,5 a 2 telas. Tudo bem, desde que foto e vídeo continuem no topo e o Salvar continue fixo.
- Com o teclado aberto, a barra fixa do Salvar ocupa parte do pouco espaço que sobra. Sugestão: esconder a barra enquanto um campo de texto está em foco e mostrar de novo ao fechar o teclado.
- Campo de preço: abrir o teclado numérico e formatar sozinho ("890" vira "R$ 8,90").

**Foto e vídeo em duas etapas**

- **R8 — O desenho melhora a edição, mas não a criação.** A tela 09 põe "Trocar foto" e "Trocar vídeo" lado a lado no topo, o que resolve a distância (hoje o vídeo está 2,3 telas abaixo). Só que ela mostra um produto que **já tem** foto e vídeo. A dúvida do responsável nasce na tela **Novo produto**, que não foi desenhada: lá o vídeo continua bloqueado até salvar. Proposta:
  1. Em "Novo produto", os dois quadros aparecem vazios no topo: "Adicionar foto" e "Adicionar vídeo (opcional)".
  2. Enquanto não houver foto, o quadro de vídeo fica apagado com a frase "Escolha a foto primeiro". Com a foto escolhida, ele acende.
  3. A pessoa preenche nome, preço e categoria e toca **Criar produto** uma vez.
  4. Aparece o andamento: "1. Salvando o produto ✓ · 2. Enviando a foto… · 3. Enviando o vídeo". O botão fica travado até o fim.
  5. Se o vídeo falhar, o produto fica salvo com a foto e a tela avisa: "Produto criado. O vídeo não foi enviado — Tentar de novo".
  6. Ao terminar: "Produto criado ✓ — Ver no cardápio", no topo da tela, não no fim.
- **R9 — Limite de vídeo divergente.** O desenho diz "até 15 s e 10 MB"; o sistema aceita 50 MB e compacta sozinho. Usar um texto só: "Vídeo opcional, até 15 segundos."
- Falta mostrar onde ficam "Remover foto" e "Remover vídeo" e a regra de que a foto não sai enquanto houver vídeo. Sugestão: um "×" no canto de cada quadro; ao tentar remover a foto com vídeo presente, perguntar "Remover a foto e o vídeo?".

---

## 6. O que não consegui ver

| O que | Por quê | O que falta para ver |
|---|---|---|
| **Categorias, Destaques e Loja por dentro** | Depois de Resumo, Produtos, edição e "Novo produto", o controle automático de permissões desta sessão bloqueou novas navegações no painel logado (motivo informado: tratamento de dados pessoais). Não insisti. Essas três telas foram avaliadas pelo código. | O responsável liberar a navegação para o agente, ou mandar capturas dessas três telas no celular (inteiras, rolando). |
| Medidas exatas em "Novo produto" | Mesma trava: só consegui capturas de tela, não medição. As posições vêm da tela de edição, que usa o mesmo formulário. | Idem. |
| "Editar" em Categorias/Destaques, menu de exclusão, avisos de erro e de sucesso | Regra de só leitura: não toquei em nenhum botão de ação. O comportamento descrito em A8, A16, A17, A19 e A20 vem da leitura do código. | Um teste em desenvolvimento, com dados de mentira, feito por quem pode salvar. |
| Envio real de foto e de vídeo (progresso, compactação, recusa) | Não enviei arquivos. | Idem. |
| O redesign funcionando | Ainda não está no ar; vi as imagens e o código em andamento. O protótipo local (`prototipo-v2/index.html`) não abre no navegador embutido. | Publicar o redesign em homologação e repetir esta revisão. |
| Cardápio com fotos reais | 10 dos 11 produtos estão sem foto. | Cadastrar as fotos. |
| Info com endereço, telefone, WhatsApp e Instagram; aviso da loja na Início | A homologação não tem esses dados cadastrados. | Preencher em Loja. |
| Celular de verdade | Usei o navegador do computador imitando o tamanho do celular. Não vi: teclado cobrindo a tela, iPhone com a barra de gestos, toque com o dedo, internet da loja. | Abrir no aparelho do responsável e em um iPhone. |
| Leitor de tela e painel no computador | Fora do foco (celular). Só conferi contraste, tamanho de alvo e estrutura. | Uma revisão de acessibilidade separada, se for prioridade. |

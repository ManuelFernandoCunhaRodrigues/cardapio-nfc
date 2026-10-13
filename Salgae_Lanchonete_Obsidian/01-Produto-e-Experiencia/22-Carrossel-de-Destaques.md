---
titulo: "Carrossel automático de destaques"
area: Produto
tags:
  - produto
  - experiencia
  - aprovado
atualizado: 2026-10-13
---
# Carrossel automático de destaques

Voltar: [[00-Comece-Aqui]] · Relacionado: [[04-Experiencia-do-Cliente]] · [[05-Painel-Administrativo]] · [[23-Refatoracao-de-Design-2026-10]]

> **Status: desenvolvido e no stage desde 2026-10-13.** Planejado entre o Claude Code e o Codex, apresentado ao responsável e aprovado por ele em 2026-10-12. Ainda não está na produção.

## O que foi pedido (2026-10-12)

Nas palavras do responsável, organizadas:

1. No painel, a pessoa pode cadastrar **quantos destaques quiser**.
2. No cardápio, os destaques **rolam sozinhos**, em carrossel automático.
3. Primeiro planejar com o Codex, depois apresentar o plano e só então executar.

## O que já existia

- Não há limite de quantidade de destaques: nem no banco (`highlights`), nem no painel, nem na validação.
- A tela inicial já mostra todos os destaques ativos em uma faixa, mas só troca quando o cliente arrasta com o dedo.
- Os pontinhos abaixo do banner eram fixos (o primeiro sempre aceso).
- O segundo destaque aparecia de novo, em uma faixa "Em destaque" abaixo de "Mais pedidos".

Faltava, portanto, só o comportamento do carrossel. Tabela, permissões e envio de imagem não mudam.

## Como vai funcionar para o cliente

- O banner troca de destaque sozinho a cada **6 segundos**. Depois do último, volta ao primeiro.
- Pausa quando a pessoa toca ou arrasta o banner, passa o mouse, navega pelo teclado, troca de aba ou rola a página até o banner sair da tela. Retoma quando isso acaba.
- Os pontinhos ficam embaixo, no centro do banner, como na referência; acompanham o destaque da vez e são clicáveis ("Ir para destaque 2 de 4"). Com mais de 8 destaques ativos, no lugar dos pontinhos aparece um contador ("3 de 9").
- **Não há botão de pausar** (decisão de 2026-10-13, abaixo). O banner continua pausando sozinho enquanto a pessoa toca, arrasta, passa o mouse ou navega pelo teclado.
- Setas de anterior e próximo só no computador. No celular valem o dedo e os pontinhos.
- Com a opção do aparelho de reduzir animações ligada, o banner **não troca sozinho**.
- Com um destaque só: banner parado, sem pontinhos nem botão. Sem nenhum destaque: o banner padrão da casa.
- O banner inteiro leva ao destino do destaque.

## Como vai funcionar no painel

- `/admin/destaques` continua igual: criar, editar, ordenar, ativar, desativar, imagem e destino, sem limite de quantidade.
- Novo: contador "N ativos de M destaques".
- Novo: acima de **8 ativos**, um aviso de que os últimos recebem pouca atenção e a página baixa mais imagens. É só aviso; não bloqueia.
- O tempo de troca é fixo; não há campo novo no painel.

## O que sai

A faixa "Em destaque" abaixo de "Mais pedidos". Com o carrossel, ela só repetiria um destaque que já passa no banner.

## Decisões do responsável (2026-10-12)

| Pergunta | Resposta |
| --- | --- |
| Tempo entre as trocas | 6 segundos |
| Tirar a faixa repetida do segundo destaque | Sim |
| Botão de pausar no banner | Sim em 2026-10-12; **retirado em 2026-10-13** |
| Executar o plano | Sim |

### Ajuste pedido em 2026-10-13

Depois de ver o stage, o responsável mandou três imagens (os cards e o banner como estavam no celular dele e uma referência) e pediu:

- **Banner maior**, como o da referência: 240 px de altura em qualquer celular, com título em duas linhas, frase e botão. Antes, em telas baixas ele encolhia para 148 px e escondia a frase.
- **Pontinhos embaixo, no centro**, como na referência.
- **Sem o botão de pausar**: o carrossel é automático. Isso revê a resposta de 2026-10-12. Consequência registrada: a regra de acessibilidade para conteúdo que se move sozinho (WCAG 2.2.2) pede um jeito de pausar; ficam as pausas por toque, mouse e teclado, e o carrossel segue parado para quem pede menos animação no aparelho.
- **Cards no primeiro tamanho** (em pé, com foto, descrição e preço) em qualquer celular. Antes, em telas baixas eles encolhiam para o preço caber na primeira tela; com o banner maior e o card inteiro, em celular pequeno o preço fica abaixo da primeira tela.

Recomendação registrada: manter de 3 a 6 destaques ativos.

## Notas técnicas

- Sem migration, sem biblioteca nova, sem rota nova.
- O servidor continua entregando todos os destaques em uma faixa com encaixe (`scroll-snap`). Uma pequena parte interativa no navegador cuida do índice, do temporizador, da pausa e da rolagem. Sem JavaScript, a faixa segue rolável com o dedo e cada banner continua sendo um link.
- Desempenho: altura fixa do banner; só a imagem do primeiro destaque carrega com prioridade, as demais sob demanda.
- Acessibilidade: região com rótulo "Destaques da casa" e descrição de carrossel; cada item informa a posição; nenhuma leitura automática a cada troca (anúncio só quando o usuário troca pelo ponto ou pela seta); os controles ficam fora do link do banner; pontos com alvo de toque de 24×32 px. Sem o botão de pausar, o critério 2.2.2 do WCAG (conteúdo que se move sozinho por mais de 5 segundos precisa de pausa) fica atendido só em parte.
- Testes: lógica de avanço e pausa com temporizador simulado; ordem e filtro de ativos; contador e aviso do painel em 8 e 9 ativos; no navegador, toque, pontos, teclado, troca de aba, redução de movimento e 0, 1 e muitos destaques.

## Em aberto

- **Imagens nos destaques dos alimentos (2026-10-12):** o responsável mencionou a possibilidade de a pessoa colocar imagens nos destaques dos alimentos. Cada destaque já aceita uma foto enviada pelo painel ("Foto do banner") e, com o painel novo, o destino do destaque pode ser um produto escolhido em uma lista. O que **não** existe é o destaque usar sozinho a foto do produto escolhido. Falta ele dizer se é isso que quer.
- Se destaques também poderão ter vídeo (pendência antiga de [[03-Decisoes-do-Projeto]]).

---
titulo: "Refatoração de design (outubro de 2026)"
area: Design
tags:
  - design
  - ui
  - aprovado
atualizado: 2026-10-12
---
# Refatoração de design (outubro de 2026)

Voltar: [[_Indice-04-Design-e-Identidade-Visual]] · Relacionado: [[17-Design-System-UI]] · [[19-Referencia-Layout-Cardapio]] · [[22-Carrossel-de-Destaques]]

> **Status: desenho aprovado em 2026-10-12; desenvolvimento em andamento.** Esta nota resume o que foi aprovado. O detalhe completo (medidas, cores, componentes, impacto no código) fica em `docs/design/refatoracao/especificacao.md`, com as telas em `docs/design/refatoracao/telas/` — esses arquivos sobem ao repositório junto com o código do novo visual.

## De onde veio

O responsável pediu um novo visual para o cardápio e para o painel, com a logo centralizada no topo, tomando como referência a tela inicial de um aplicativo de hamburgueria ("Ember & Grill"). Depois de ver a primeira versão, pediu os produtos em cards em pé, em faixa horizontal, no estilo do cardápio do KFC (revisão 2, 2026-10-11).

## O que foi aprovado

### Cardápio do cliente

- **Cabeçalho igual em Início, Cardápio, Busca e Info:** situação da loja (Aberta/Fechada) à esquerda, logo centralizada, botão de informações à direita. A saudação "Olá! Bem-vindo à Salgaê" sai do topo.
- **Fundo creme com cartões brancos**, no lugar do fundo branco.
- **Banner de destaque escuro**, com o título em duas cores (a última palavra em âmbar) e o banner inteiro clicável.
- **Duas famílias de letra em vez de quatro:** Poppins e Nunito Sans. Saem a Anton e a JetBrains Mono. Isso revê a decisão de 2026-10-08 sobre o título do banner.
- **Verde da marca** para "Aberta", "Disponível agora" e o selo NOVO. Antes, aberta e fechada usavam dois tons de marrom quase iguais.
- **Cards em pé em faixa horizontal** no Cardápio e em "Mais pedidos": cabem 2 cards inteiros e metade do terceiro; no fim da rolagem a metade fica à esquerda. Card com foto, nome e descrição em até 2 linhas, preço e seta. O cardápio **não** vira lista vertical.
- **Barra inferior com 4 abas** (Início, Cardápio, Busca, Info), item ativo em pílula, sem botão central.
- Busca sem resultado ganha botão "Ver cardápio completo" e atalhos de categoria. Info mostra o dia de hoje marcado e, quando fechada, o dia e a hora da próxima abertura.

### Painel

- Mesmo cabeçalho com logo e mesmas cores do cardápio.
- **Resumo com a lista "Precisam de atenção"** (produtos indisponíveis ou sem foto).
- **Produtos:** alternador "Disponível" como ação rápida e um menu "⋯" para as demais ações; filtro de categoria em chips no celular.
- **Edição de produto:** a barra inferior some para dar espaço ao formulário; foto e vídeo no topo; botão Salvar fixo no rodapé.

### Decisões do responsável (2026-10-12)

| Pergunta | Resposta |
| --- | --- |
| Visual do cardápio do cliente (telas da revisão 2) | Aprovado como está |
| Painel: esconder a barra na edição e criar "Precisam de atenção" | Sim, os dois |
| Esperar fotos reais dos produtos | Não; começar sem as fotos, que entram depois pelo painel |
| Cardápio em lista vertical | Não (revisão 2) |
| Melhorias novas da revisão de UX no celular | Todas as 12 |

## Como será entregue

1. **Pacote A — cardápio do cliente** e base visual (cores, letras, cabeçalho).
2. **Carrossel automático de destaques** — [[22-Carrossel-de-Destaques]].
3. **Pacote B — painel.**

Cada pacote passa pelos testes cruzados ([[11-Agentes-de-IA]]) e vai para o stage ao entrar na `develop`. A ida para a produção acontece junto com a compactação de vídeo, depois que o responsável conferir no stage e autorizar ([[03-Decisoes-do-Projeto]]).

## Revisão de UX no celular

Em 2026-10-12 o responsável pediu também uma revisão de design e UX voltada ao celular, olhando o cardápio e o painel no navegador, para apontar o que ainda pode melhorar. O relatório completo está em `docs/design/revisao-ux-mobile-2026-10.md`.

**Como foi feita:** cardápio do stage em 390×844 e 360×640; painel do stage por dentro (Resumo, Produtos, edição e novo produto), com o responsável logado e sem alterar nada. Categorias, Destaques e Loja foram avaliadas só pelo código, porque a navegação nessas telas não foi liberada na sessão.

**Melhorias novas apontadas, por prioridade** — **todas as 12 aprovadas pelo responsável em 2026-10-12**:

| # | Melhoria | Gravidade | Esforço |
| --- | --- | --- | --- |
| 1 | Produto com foto e vídeo em um passo só, com andamento visível e botão travado até terminar | alta | médio |
| 2 | "Aberta/Fechada" calculado na hora em que a tela abre (hoje pode aparecer "Aberta" com a loja fechada) | alta | pequeno a médio |
| 3 | Voltar do produto para o mesmo lugar; busca que lembra o termo | alta | pequeno |
| 4 | Avisos visíveis no painel: salvou, deu erro, sair sem salvar | alta | pequeno |
| 5 | Horários da loja em uma linha por dia, com "copiar para todos os dias" | alta | médio |
| 6 | Categorias e Destaques com editor que sobe de baixo; cartão de produto inteiro abre a edição | alta | médio |
| 7 | Abrir ou fechar a loja em dois toques pelo topo do painel | média | médio |
| 8 | Banner sem cortar o botão; preço visível na tela inicial em celular pequeno | média | pequeno |
| 9 | Uma situação só por produto: No cardápio · Em falta hoje · Escondido | média | médio |
| 10 | "Mais desta categoria" no detalhe; indisponíveis no fim de cada faixa; busca pelo nome da categoria | média | médio |
| 11 | Textos do painel sem termos técnicos; destino do destaque como escolha em vez de endereço digitado | média | pequeno + médio |
| 12 | Organizar a ordem por categoria; filtros "Indisponíveis / Sem foto / Desativados" | média | médio |

**Onde cada uma entra:** as do cardápio do cliente (2, 3, 8 e 10) vão junto com o novo visual do cardápio e o carrossel; as do painel (1, 4, 5, 6, 7, 9, 11 e 12) vão no pacote do painel.

Acabamentos rápidos listados à parte, que entram junto: resposta visual ao toque, contorno de foco mais forte, mostrar a senha no login, categoria de um item sem linha vazia e tela inicial da busca com atalhos.

## O que não muda

Banco de dados, rotas, regras de acesso e envio de mídia. O produto continua sendo só consulta: sem carrinho, pedido, avaliações, favoritos ou conta de cliente.

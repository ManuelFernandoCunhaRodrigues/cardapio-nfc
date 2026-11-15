# Achados dos testes no navegador (2026-11-04)

Testes na produção publicada, em 375 px e 1280 px: páginas públicas em navegador automatizado e painel com a sessão do responsável, sem salvar nada. O plano de testes foi validado pelo Codex antes de rodar. Tudo o que grava fica para o stage e para os testes de ponta a ponta.

## O que passou

- Início, Cardápio, Busca, Produto, Info e página 404: sem erro de console ou de rede, sem rolagem lateral e sem imagem quebrada.
- Busca com e sem acento, por nome, categoria e descrição; o termo se mantém ao voltar do produto.
- Botão Voltar conforme a origem, vídeo do produto, carrossel, ida às categorias a partir da Início, foco por teclado.
- Painel: Resumo, Produtos com filtros, Categorias, Destaques, Loja e edição de produto, nos dois tamanhos.

## O que precisa ser corrigido

| # | Gravidade | Problema visto | Correção | Quem faz |
| --- | --- | --- | --- | --- |
| 1 | Alta | Ao trocar de tela pelo menu do painel, as alterações não salvas do produto se perdem sem aviso; a Loja não tem nenhuma proteção | Pedir confirmação ao sair por qualquer link interno, em Produto e Loja | Claude |
| 2 | Alta | O Resumo diz que 28 produtos aparecem no cardápio, mas só 24 aparecem: categoria escondida não é contada, e a lista mostra esses produtos como "No cardápio" | Contar só o que aparece de fato e sinalizar a categoria escondida no Resumo e em Produtos | Claude |
| 3 | Média | Trocar de tela no painel leva alguns segundos sem sinal, e cada página pede os dados de todas as telas do menu com antecedência | Tela de carregamento do painel, que também limita esses pedidos antecipados | Claude |
| 4 | Média | O aviso "já está no limite da lista" continua no cartão depois de outras ações | Tirar o aviso quando a próxima ação da lista começar | Claude |
| 5 | Média | Na Loja, o quadro marcado ao lado de "Domingo" significa fechado, mas essa palavra só existe para leitor de tela: parece que a loja abre no domingo | Mostrar "Fechado" na tela | Claude |
| 6 | Baixa | O botão diz "Esconder", a confirmação diz "desativada" e o filtro diz "Desativados" | Usar sempre esconder e escondido | Claude |
| 7 | Média | No cardápio, a categoria Combos nunca fica marcada, e tocar em Combos ou Salgado marca outra; o chip marcado também pode ficar fora da tela | Corrigir a marcação nas últimas categorias e levar o chip para a área visível | Codex |
| 8 | Média | O selo "VÍDEO CURTO · SEM SOM" fica cortado pela parte branca da página do produto | Subir o selo e conferir os controles do vídeo | Codex |
| 9 | Baixa | Buscar só com espaços mostra a lista inteira e suja o endereço | Tratar como busca vazia | Codex |
| 10 | Baixa | Cardápio, Busca e Info têm o mesmo título de aba | Dar título próprio a cada uma | Codex |

## Testes novos

O Codex escreve os testes de ponta a ponta do que ainda não tem cobertura:

- as três situações do produto;
- esconder categoria com produtos;
- sessão expirada durante uma gravação;
- clique repetido em Produtos e Destaques.

Cada um revisa o que o outro fez antes de juntar.

## O que depende do responsável

Não é defeito de código, por isso nada disso muda sem decisão dele:

- A categoria Bebidas está escondida na produção, e 4 produtos sumiram do cardápio.
- Ordem das categorias, mudada pelos cliques: Bebidas, Pastéis, Esfihas, Pizzas, Doces, Salgado, Combos.
- Conteúdo de teste na produção: "Coixinha" (com foto de geladeira) e "Chilveski".
- Endereço, telefone, WhatsApp e Instagram em branco; a página Info só mostra os horários.
- Teste em celular real.

## Limite conhecido

O botão Voltar do navegador dentro do painel continua sem aviso de alteração não salva. O Next não oferece um jeito direto de interceptar esse caso, e isso não será forçado agora.

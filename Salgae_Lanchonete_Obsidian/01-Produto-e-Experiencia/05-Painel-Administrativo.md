---
titulo: "Painel administrativo"
area: Produto
tags:
  - produto
  - experiencia
atualizado: 2026-11-16
---
# Painel administrativo

Voltar: [[00-Comece-Aqui]] · Base técnica: [[06-Arquitetura-e-Stack]]

## Finalidade

O painel é o local seguro onde a equipe administra o conteúdo que aparece no cardápio. A pessoa não deve precisar editar código, publicar manualmente uma nova versão ou conhecer o banco de dados para atualizar itens.

## Módulos do MVP

### Autenticação

- Login para usuários autorizados.
- Encerramento de sessão e recuperação segura de acesso. Em 2026-11-16, a recuperação de senha pelo painel ainda não existe: é uma sugestão da revisão de 2026-11-15, não uma entrega.
- Mensagens neutras em falha de login, sem revelar se um e-mail existe.

### Dashboard simples

- resumo de produtos ativos, indisponíveis e sem foto;
- atalhos para cadastrar produto e categoria;
- avisos que ajudem a manter o cardápio completo.

### Entrada no painel

- enquanto o login acontece, o botão mostra um indicador girando e "Entrando…"; aceito o login, mostra um sinal de confirmado e "Abrindo o painel…" até a tela trocar;
- com "menos animação" ligado no aparelho, o botão só troca o texto.

### Botões de ação rápida

- valem para Subir, Descer, Esconder e Mostrar nas listas do painel;
- a resposta pode levar alguns segundos: enquanto isso, o botão de seta mostra um indicador girando, o de texto fica mais claro, e os botões da mesma lista ficam em espera, com cliques ignorados, para não formar fila e seguir mexendo na lista depois;
- com "menos animação" ligado no aparelho, a seta não gira, só fica mais clara;
- a seta fica apagada quando o item já está no início ou no fim da lista (em produtos, no início ou no fim da categoria, desde o PR #91).

### Categorias

- criar, editar, ordenar, esconder e mostrar (categoria escondida esconde também os produtos dela, e o Resumo e Produtos sinalizam isso);
- impedir exclusão perigosa de categoria que ainda possui produtos, oferecendo migração ou confirmação explícita;
- foto da categoria, com prévia redonda, troca e remoção; ela aparece no círculo da tela inicial;
- manter um identificador estável para URLs e integrações internas.

### Produtos

- nome, preço, descrição, categoria, selo, imagem, vídeo curto opcional, ordem e **situação** (No cardápio · Em falta hoje · Escondido), que substitui os antigos "ativo" e "disponibilidade" separados;
- validação antes de salvar;
- prévia do que será mostrado no cardápio;
- confirmação antes de ações irreversíveis;
- envio, prévia, troca e remoção do vídeo do produto, com aviso claro dos limites (formato, duração e tamanho);
- remoção ou substituição segura da imagem ou do vídeo antigo, conforme [[08-Imagens-e-Storage]].

### Destaques

- cadastrar arte, título, texto opcional, destino e ordem de exibição;
- esconder e mostrar sem apagar o histórico;
- validar tamanho e formato da imagem para não prejudicar a página pública;
- sem limite de quantidade; contador de destaques ativos e aviso acima de 8 ativos ([[22-Carrossel-de-Destaques]]);
- destino do destaque como escolha: cardápio inteiro, uma categoria, um produto ou um endereço próprio.

### Painel novo (outubro de 2026)

Resumo de [[23-Refatoracao-de-Design-2026-10]], para quem opera:

- **Resumo** com a lista "Precisam de atenção" (produtos em falta ou sem foto); cada número leva à lista já filtrada.
- **Uma situação por produto:** No cardápio · Em falta hoje · Escondido.
- **Produto com foto e vídeo em um passo só:** a pessoa escolhe os dois antes de salvar e acompanha o andamento.
- **Abrir ou fechar a loja em dois toques**, pela pílula no topo do painel; "Voltar a seguir os horários" desfaz.
- **Horários** em uma linha por dia, com "Copiar para todos os dias".
- **Editar categoria ou destaque** abre uma folha na frente, sem sair da lista.
- **Avisos** de "salvou" e "deu erro" visíveis em cada ação.

### Ajustes de novembro de 2026

- **Esconder** e **Escondido** em todo lugar, no botão, na confirmação e no filtro (PR #85).
- Sair por um link do menu com alteração não salva no produto ou na Loja **pede confirmação**. O botão Voltar do navegador não pergunta (limite conhecido) (PR #85).
- Quando o servidor recusa, os formulários da Loja, dos Destaques e das Categorias **mantêm o que foi digitado** e o foco vai ao primeiro campo com erro (PR #91).
- No editor de produto, trocar só categoria, selo ou situação também conta como alteração; o vídeo é conferido na hora da escolha; a prévia do cartão não é mais um link (PR #91).
- Painel mais rápido (funções em São Paulo e sessão conferida uma vez por tela) e tela de erro própria, com "Tentar de novo" e volta ao Resumo (PR #89).
- A página pública do produto atualiza logo depois de salvar (PR #100).

### Dados da loja

- editar nome, frase, endereço, link do mapa, telefone, WhatsApp e Instagram;
- horário de funcionamento por dia da semana, com opção de dia fechado;
- abrir ou fechar a loja manualmente, sobrepondo o horário (ex.: feriado);
- aviso curto opcional exibido no cardápio (ex.: "Hoje fechamos às 15h");
- cada alteração fica registrada na auditoria.

### Uso pelo celular

O cadastro precisa funcionar bem no celular de quem atende:

- formulários em tela cheia, uma coluna, com botão **Salvar fixo** no rodapé;
- foto pela **câmera ou galeria**, com prévia antes de salvar e indicador de progresso do envio;
- vídeo curto gravado ou escolhido no aparelho, com aviso dos limites antes de enviar;
- teclado numérico para preço (`inputmode="decimal"`), campos e botões com alvo de toque ≥ 44 px;
- listas em cartões (não tabelas largas) e ações principais ao alcance do polegar.

## Permissões iniciais

Começar com o menor número de papéis possível: **administrador**. Se outra pessoa passar a editar somente produtos, criar papel **editor** com permissões limitadas. As regras devem ser aplicadas no banco, não apenas escondidas na interface.

## Critério de pronto

Uma pessoa autorizada consegue alterar um preço ou marcar um item como **Em falta hoje**, confirmar a alteração e vê-la refletida no cardápio público sem expor funções administrativas ao visitante.

## Na demonstração

O que mostrar do painel e como desfazer depois está em [[15-Operacao-e-Manutencao]] e em `docs/publicacao-producao.md`. O guia para quem usa o painel é o `docs/guia-da-equipe.md`.

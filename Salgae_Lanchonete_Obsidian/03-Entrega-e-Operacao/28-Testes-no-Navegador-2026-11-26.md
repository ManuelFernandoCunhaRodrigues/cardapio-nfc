---
titulo: "Testes no navegador (2026-11-26)"
area: Operacao
tags:
  - testes
  - operacao
atualizado: 2026-11-26
---
# Testes no navegador (2026-11-26)

Pedido do responsável: abrir o cardápio e o painel, clicar, procurar lentidão e qualquer coisa fora do comum, e listar tudo para planejar a correção.

Testes feitos de madrugada (~1h, loja fechada), no Chrome, nos dois ambientes:

- **Produção** (`salgae-producao`): roda a `main` em dfce7ef, de 2026-11-04.
- **Stage** (`salgae-homologacao`): roda a `develop`.

Só leitura e navegação, sem gravar nada.

## O que ficou de fora

**Painel administrativo.** Nenhum dos dois ambientes tinha sessão aberta no navegador, e o Claude não digita senha para entrar. Para testar o painel com cliques, o responsável entra no painel do stage (no Chrome ou no navegador do app) e deixa a aba aberta. A tela de login do stage abriu em 0,4 s e está correta. As telas internas continuam cobertas pelos testes de ponta a ponta do CI (painel no computador e no celular), que passaram em 19ab705.

## O que passou

- Início, Cardápio, Busca, Produto, Info e 404, nos dois ambientes: todas respondem com 200 (404 onde deve), sem erro de console e sem imagem quebrada.
- O Cardápio da produção fica pronto em 1,4 s, com 270 KB e 26 pedidos. No stage, em 0,7 s.
- Navegação dentro do site: de 50 a 100 ms por troca de tela.
- Busca: aceita maiúsculas e palavras sem acento ("pasteis", "PASTEL"), e "zzz" mostra uma mensagem clara de nada encontrado.
- Chips de categoria: levam à seção certa e marcam o chip ativo, inclusive na última categoria.
- Voltar de um produto: devolve a rolagem ao mesmo ponto (ver a exceção no item 5).
- Status da loja: "Fechada · Abre quinta às 08:00" bate com o horário cadastrado.
- Página 404 do stage: mensagem e botão para o cardápio.
- Carrossel de destaques: troca a cada 6 s e pausa com o mouse em cima, como previsto.

## O que precisa de atenção

| # | Gravidade | Onde | Problema visto | Plano | Quem decide ou faz |
| --- | --- | --- | --- | --- | --- |
| 1 | Alta | Produção | A produção está três semanas atrás da `develop`. Nenhuma correção feita desde o #85 chegou lá: ondas 1 a 8, achados desta nota 16 e da 27. Exemplo visível: o produto diz "Disponível agora" com a loja fechada. No stage já aparece "Disponível no horário da loja · abre hoje às 08:00". | Promover a `develop` para a `main`. Antes: backup do banco de produção e aplicação das migrations 20261115120000 e 20261116120000. Depois: conferir as rotas e o painel. | "Sim" do responsável; Claude executa |
| 2 | Média | Produção | O conteúdo tem nomes de teste ("Coixinha", "Chilveski", "Pastel" indisponível), e a Info não tem endereço. | Conteúdo de exemplo da onda 6, já aprovado: corrigir os nomes, gerar fotos com o Codex e preencher a Info com dados fictícios, sem contato. Fazer primeiro no stage. | Claude (aprovado em 2026-11-25) |
| 3 | Média | Stage e produção | A migration 20261116120000 (destaque segue o slug) não foi aplicada no stage: um destaque abre `/produto/b15677c0-…` (pelo id) em vez do endereço com o nome. Funciona, mas o endereço fica feio e não acompanha a troca de nome. | Aplicar a migration no stage e depois na produção, junto com a decisão sobre o workflow de migrations. | Responsável decide o workflow; Claude aplica |
| 4 | Baixa | Produção | A primeira visita a um produto depois de uma alteração demora de 1,0 a 1,6 s (cache `REVALIDATED`), contra ~0,2 s nas seguintes. Aconteceu em 8 de 25 produtos. | Medir de novo depois da promoção (item 1): a `develop` mudou o prefetch e o cache das páginas de produto. Só agir se continuar. | Claude |
| 5 | Baixa | Stage | A pessoa chega ao Cardápio por um atalho da Início, e o endereço fica `/cardapio#combos`. Se ela rolar, abrir um produto e voltar, a página pula para a seção da categoria (1022 px) em vez de voltar ao ponto onde estava (1475 px). Sem o `#`, a rolagem volta certinho. Na produção, depois de tocar num chip dentro do próprio Cardápio, também voltou certo, mas é outro caminho e não foi repetido no stage. | Reproduzir os dois caminhos no stage, corrigir a restauração da rolagem com âncora e cobrir com teste de ponta a ponta. | Claude com o Codex |
| 6 | Baixa | Stage | O stage tem dados de teste ("QA Teste Excluir", "Coixinha de Carne"), e só 3 dos 12 produtos têm foto. Não afeta a produção, mas atrapalha quem testar o stage. | Limpar os dados de teste do stage junto com o conteúdo de exemplo (item 2). | Claude |

## Ordem sugerida

1. Item 2 no stage (conteúdo de exemplo) e item 6 (limpeza do stage).
2. Item 5 (rolagem com âncora), num PR pequeno para a `develop`.
3. Teste do painel com a sessão do responsável no stage.
4. Com o "sim" dele: backup, migrations (item 3) e promoção (item 1), e então o item 2 na produção.
5. Item 4: medir de novo na produção já promovida.

Ver também: [[16-Achados-dos-Testes-no-Navegador]], [[27-Revisao-Geral-e-Plano-de-Acao]].

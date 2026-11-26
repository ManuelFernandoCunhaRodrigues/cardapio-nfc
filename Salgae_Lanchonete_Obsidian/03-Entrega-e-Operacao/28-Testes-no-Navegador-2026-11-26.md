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

## Andamento (2026-11-26, manhã)

- **Item 3, no stage:** feito. A migration 20261116120000 foi aplicada à mão, com a mesma versão em `schema_migrations`, e o destaque passou a abrir `/produto/pastel-de-carne`. Na produção, entra junto com a promoção.
- **Item 5:** feito no #129 (251f405), com a revisão do Codex e o CI verde. Causa: o navegador reativava o `#categoria` da entrada do histórico ao voltar. O link do produto passou a tirar o fragmento antes de navegar, e um E2E novo cobre os dois caminhos.
- **Itens 2 e 6, no stage:** em parte. "Coixinha de Carne" virou "Coxinha de Carne" (com o endereço `coxinha-de-carne`), "QA Teste Excluir" foi escondido (nada apagado), e a Info ganhou o endereço fictício "Rua das Flores, 120 · Centro", sem contato. Tudo conferido no site do stage. Falta foto em 9 dos 12 produtos do stage: não há chave de serviço no CI e o Claude não entra no painel, então o envio fica com o responsável. Isso não afeta a produção, que já tem foto em todos os produtos.
- **Itens 1 e 2, na produção:** prontos para executar. O PR de promoção #128 está em rascunho, com o CI verde, e espera o "sim" do responsável. Ao receber o "sim": copiar as tabelas da produção para um esquema de backup dentro do próprio banco, aplicar as duas migrations, mesclar o #128, conferir as rotas e corrigir os nomes "Coixinha", "Chilveski" e "Pastel", além da Info.

## Andamento (2026-11-26, promoção)

O responsável disse "sim, promover".

- **Backup:**
  - O esquema `backup_20261126`, no banco da produção, guarda cópias de `categories`, `products`, `highlights`, `store_settings` e `profiles`.
  - Esse esquema não aparece na API pública: está com RLS ligado e sem permissão para `anon` e `authenticated`.
  - Para desfazer uma mudança, basta copiar dessas tabelas de volta.
- **Item 3, na produção:** feito.
  - As migrations 20261115120000 e 20261116120000 foram aplicadas à mão, com as mesmas versões dos arquivos em `schema_migrations`.
  - Os quatro destaques já apontavam para `/cardapio#combos`, então nenhum destino mudou.
  - O check `migrations` do PR continua falhando, porque faltam os segredos do Supabase no GitHub. A decisão sobre esse workflow segue com o responsável.
- **Item 1: NÃO concluído. O código novo não chegou ao público.**
  - O #128 entrou na `main` (db65a3b), e o #133 depois (4fe8a4c). Os dois deploys de produção na Vercel foram **cancelados**.
    - A Vercel marca esses deploys como `success`, com a descrição "Canceled by Ignored Build Step". O Claude leu só o estado e registrou a publicação como feita.
    - O responsável viu o cancelamento no painel da Vercel.
  - O domínio `salgae-producao.vercel.app` continua no deploy de 2026-11-04 (dfce7ef). A página de produto ainda mostra "Disponível agora", texto do código antigo.
  - As rotas conferidas (200, 307, 401, 404) respondem do mesmo jeito no código antigo, então não provavam a publicação.
  - **O que vale na produção:** o banco foi atualizado (backup, as duas migrations e o conteúdo do item 2) e aparece com o código antigo.
    - As migrations foram feitas para funcionar com o código que está no ar.
  - **Causa, lida nas configurações da Vercel (sem mudar nada):**
    - Só o projeto `salgae-producao` tem o Ignored Build Step `[ "$VERCEL_ENV" != "production" ]`. O `salgae-homologacao` não tem nenhum.
    - Desde que essa configuração existe, todo deploy pelo Git é cancelado no mesmo instante em que é criado, sem log de build, inclusive os de produção da `main`.
    - O último deploy pelo Git que chegou ao ar foi o de 2026-10-15. O de 2026-11-04 entrou por um "Redeploy" manual.
  - **Para publicar:**
    - Agora: um novo "Redeploy" manual do deploy cancelado da `main`, como em 2026-11-04.
    - Para não se repetir: trocar ou tirar o Ignored Build Step do `salgae-producao`.
    - As duas coisas mexem na produção e dependem do "sim" do responsável.
  - **Enquanto isso,** apresentar as mudanças pela homologação (<https://salgae-homologacao.vercel.app>).
  - **Publicado em 2026-11-26, com o "sim" do responsável ("Sim, redeploy").**
    - O Claude rodou `vercel redeploy` do deploy cancelado da `main` (4fe8a4c) para a produção.
    - O novo deploy (`dpl_FEXZvZy71ETwVePHcy6feeaG1AW9`) ficou READY em cerca de 1 minuto e assumiu `salgae-producao.vercel.app`.
    - **Conferido no código, não só no status:**
      - A API da Vercel mostra a produção apontando para esse deploy, de 4fe8a4c.
      - O texto "Compartilhar cardápio", que só existe no código novo, aparece na Início.
    - Rotas depois do redeploy: públicas e `/admin/login` com 200, `/admin` com 307, `/api/v1/admin/session` com 401, slug antigo e endereço inexistente com 404. A Info mostra o endereço novo.
  - **Ainda pendente:** o Ignored Build Step do `salgae-producao` continua igual. A próxima promoção pela `main` vai ser cancelada de novo, a não ser que ele seja trocado ou removido. A decisão é do responsável.
- **Item 2, na produção:** feito, nada apagado.
  - "Coixinha" foi escondido, porque a foto dele é a vitrine da loja, não uma coxinha.
  - "Chilveski" virou "Pastel de Frango com Milho" (`pastel-de-frango-com-milho`) e passou para Pastéis, porque a foto e a descrição são de pastel. O gatilho novo o levou para o fim da categoria.
  - "Pastel" virou "Pastel de Carne com Queijo" (`pastel-de-carne-com-queijo`), ganhou descrição e voltou a ficar disponível.
  - A Info ganhou o endereço fictício "Rua das Flores, 120 · Centro", sem contato.
- **Item 4: ainda aberto.**
  - A medição feita depois do merge (primeira visita de 0,44 a 1,6 s, seguintes cerca de 0,25 s) foi no **código antigo**, porque o deploy foi cancelado.
  - Medir de novo quando o código novo estiver no ar.
  - **Medido no código novo, logo depois do redeploy:**
    - A primeira visita a cada produto levou de 0,28 a 0,65 s (cache `PRERENDER`), e as seguintes cerca de 0,25 s (`HIT`).
    - O caso original, a primeira visita depois de uma alteração feita pelo painel, ainda não foi medido. Precisa de uma sessão no painel.
- **Observação nova (baixa), conferida depois: não precisa de correção.**
  - Logo depois da troca de nome, os endereços antigos (`/produto/chilveski`, `/produto/coixinha`) mostraram "Produto não encontrado" com HTTP 200.
  - Pouco depois, os dois já respondiam 404, e continuaram assim em todas as consultas seguintes.
  - O 200 não se repetiu no stage em três tentativas, trocando o slug de produtos de lá e depois desfazendo:
    - Num produto com página gerada no build, o endereço antigo deu 200 com o conteúdo antigo por no máximo um ciclo de cache (60 s), o normal da revalidação.
    - Logo em seguida, deu 404 com `noindex`.
  - A rota de produto não tem `loading.tsx` nem `Suspense` acima da página. Então o `notFound()` sai antes de qualquer byte, e o 404 é o esperado. Os E2E `e2e/publico/cardapio.spec.ts` e `e2e/painel/situacoes-e-rajadas.spec.ts` já cobrem o 404 de slug inexistente e de produto escondido.
  - O 200 visto na produção foi uma vez só, no código antigo de 2026-11-04, porque o deploy novo foi cancelado (ver o item 1). Fica só o registro.

## Ordem sugerida

1. Item 2 no stage (conteúdo de exemplo) e item 6 (limpeza do stage).
2. Item 5 (rolagem com âncora), num PR pequeno para a `develop`.
3. Teste do painel com a sessão do responsável no stage.
4. Com o "sim" dele: backup, migrations (item 3) e promoção (item 1), e então o item 2 na produção.
5. Item 4: medir de novo na produção já promovida.

Ver também: [[16-Achados-dos-Testes-no-Navegador]], [[27-Revisao-Geral-e-Plano-de-Acao]].

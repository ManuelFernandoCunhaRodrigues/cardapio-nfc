---
titulo: "Planejamento — imagens nas categorias e imagem ou vídeo nos destaques"
area: Produto
tags:
  - produto
  - planejamento
  - em-analise
atualizado: 2026-10-13
---
# Planejamento — imagens nas categorias e imagem ou vídeo nos destaques

Voltar: [[00-Comece-Aqui]] · Relacionado: [[22-Carrossel-de-Destaques]] · [[05-Painel-Administrativo]] · [[08-Imagens-e-Storage]]

> **Status: planejado em 2026-10-13 entre o Claude Code e o Codex. Nada disto está em desenvolvimento.**
> Cada pacote só começa quando o responsável disser que pode. O pacote 1 é o roteiro de teste para a próxima vez que o trabalho for retomado.

## O que foi pedido (2026-10-13)

Nas palavras do responsável, organizadas:

1. Colocar a opção de **imagem nas categorias**.
2. Quando o trabalho for retomado, **testar as imagens que vão passar nos destaques**. Ele fornece as imagens.
3. Colocar a possibilidade de **imagem ou vídeo nos destaques**.
4. Planejar junto com o Codex, lembrando que as imagens precisam virar **WebP** para ficarem leves e que os vídeos precisam ser **compactados**.

## Como está hoje

- **Conversão de imagem para WebP: já existe.** Toda foto enviada pelo painel é reduzida no navegador (até 2048 px) e, no servidor, vira WebP em dois tamanhos: um grande (até 1600 px, meta de 300 KB) e um de cartão (até 640 px, meta de 80 KB). Vale para produtos e destaques.
- **Compactação de vídeo: já existe**, só para produtos: até 15 segundos, sem som, até 720p, arquivo final de até 4 MB.
- **Categorias:** o banco já tem o campo de imagem da categoria e a tela inicial já mostra a imagem no círculo (sem imagem, mostra um desenho). Falta o painel: não existe onde enviar a imagem.
- **Destaques:** cada destaque aceita uma foto ("Foto do banner"). Não há campo de vídeo. O carrossel com fotos nunca foi testado, porque nem o stage nem a produção têm destaque com foto.

Ou seja: os dois "algoritmos" pedidos já estão no projeto e serão reaproveitados. O trabalho novo é ligar a imagem às categorias, criar um perfil de compactação próprio para o banner e fazer o banner tocar vídeo.

## Pacote 1 — teste das imagens nos destaques (ao retomar)

1. Com as imagens fornecidas pelo responsável, cadastrar no stage pelo menos quatro destaques com foto, variando: foto deitada, em pé, quadrada, fundo claro e escuro, arquivo pesado (perto de 15 MB), imagem pequena (perto do mínimo de 400 px) e uma imagem recortada com fundo transparente.
2. Conferir em 360 e 390 px e no computador: enquadramento, corte, leitura do título e da frase sobre a foto, visibilidade dos pontinhos, troca automática sem piscar e sem o banner mudar de tamanho, e o que acontece quando a foto falha.
3. Medir: tamanho de cada arquivo gerado, quais fotos carregam logo e quais só depois, tempo de abertura da tela inicial e diferença para a tela sem fotos.
4. Aprovado se: nada salta nem pisca; texto, botão e pontinhos continuam legíveis; só a primeira foto pesa na abertura; a tela inicial abre em até 2,5 segundos no celular e não piora mais de 0,2 segundo em relação à versão sem fotos.
5. Decidir com o responsável, vendo o resultado: foto na **metade direita** (como hoje) ou no **banner inteiro** (como na referência). Recomendação: aprovar primeiro a metade direita; o banner inteiro é uma mudança visual à parte, porque exige fotos próprias para corte e uma faixa escura atrás do texto.

Achado que afeta este pacote: **imagem com fundo transparente perde a transparência**, porque hoje toda imagem vira JPEG no navegador antes de subir. Para o banner ficar como na referência (comida recortada sobre o fundo escuro), será preciso preservar a transparência no envio. Entra como ajuste do pacote 1.

Esforço: pequeno.

## Pacote 2 — imagem nas categorias

- No painel, o editor de categoria ganha "Foto da categoria", com prévia redonda, escolher, trocar e remover.
- Em categoria nova: salva primeiro, depois envia a foto. Se a foto falhar, a categoria fica criada e dá para tentar de novo.
- A foto passa pela conversão para WebP que já existe e aparece no círculo da categoria na tela inicial. Chips do Cardápio e atalhos da Busca continuam só com texto.
- Trocar ou remover apaga o arquivo antigo com segurança; excluir a categoria também apaga a foto.
- Cada troca e remoção fica registrada na auditoria.

Notas técnicas: sem mudança no banco (`categories.image_path` já existe); pasta `product-images`, subpasta `categories/`; generalizar as ações de mídia, hoje restritas a produto e destaque.

Esforço: pequeno. Não depende do vídeo.

## Pacotes 3, 4 e 5 — imagem ou vídeo nos destaques

**Como funcionaria**

- No editor do destaque, uma escolha: **Foto** ou **Vídeo**.
- Todo vídeo precisa de uma **foto de capa**: é ela que aparece primeiro e continua aparecendo se o vídeo falhar.
- O vídeo é compactado automaticamente com um perfil próprio do banner, mais leve que o dos produtos: **até 6 segundos, sem som, no máximo 640 px, arquivo final em torno de 1 MB (teto de 1,5 MB)**. O perfil dos produtos (15 segundos, 720p, 4 MB) seria exagero para um banner de 240 px e não combina com a troca a cada 6 segundos.
- No cardápio, o vídeo toca **sozinho, sem som e em repetição, só no destaque que está na tela**. Para ao sair da tela, ao trocar de aba e durante o toque.
- Quem ligou "reduzir animações" ou "economia de dados" no aparelho vê só a capa.
- O carrossel continua trocando a cada 6 segundos; não espera o vídeo.
- **No máximo 2 destaques com vídeo** ligados ao mesmo tempo, para não pesar na internet e na bateria do cliente nem na cota gratuita do Supabase.

**Divisão em pacotes**

| Pacote | O que entrega | Esforço |
| --- | --- | --- |
| 3. Base do vídeo | Campo de vídeo no destaque (mudança no banco), perfil de compactação do banner, armazenamento e limpeza de arquivos, sem quebrar o vídeo de produto | médio |
| 4. Painel | Escolha "Foto ou Vídeo", capa, andamento do envio, falhas recuperáveis, limite de dois, auditoria | médio |
| 5. Banner público | Vídeo só no destaque ativo, capa primeiro, economia de dados e menos animação, medições de desempenho | médio a grande |

**Notas técnicas**

- Banco: `highlights.video_path` com a regra "só há vídeo se houver foto". Migration necessária, aplicada no stage antes e na produção só na promoção.
- Armazenamento: reaproveitar as pastas de vídeo que já existem (`product-video-uploads` para o bruto e `product-videos` para o publicado), com subpastas próprias de destaque; a limpeza passa a consultar produtos e destaques antes de apagar.
- O compressor ganha perfis (produto e banner); o perfil é escolhido no servidor, nunca pelo navegador.
- No cardápio: capa com prioridade, vídeo com carregamento só quando o destaque fica ativo.

**Cuidados**

- O vault diz hoje que vídeo aparece só no detalhe do produto e nunca atrasa a abertura do cardápio ([[04-Experiencia-do-Cliente]]). Com vídeo no banner, a primeira regra muda e a segunda continua valendo; a revisão dessas notas faz parte do pacote 5.
- A compactação roda dentro do limite de 180 segundos da Vercel gratuita; vídeo de banner é menor, mas isso precisa ser medido no stage.
- Em 2026-10-13 o responsável tirou o botão de pausar do carrossel. Com vídeo tocando sozinho, a regra de acessibilidade para conteúdo em movimento pesa mais; fica como pergunta abaixo.

## Ordem recomendada

1. Pacote 1 (teste das imagens) — define também o tamanho ideal do vídeo.
2. Pacote 2 (imagem nas categorias) — independente; pode ir junto com o 1.
3. Pacotes 3, 4 e 5 (vídeo), nessa ordem.

Cada pacote tem PR próprio para a `develop`, passa pelo stage e só vai para a produção com a autorização do responsável.

## Perguntas para o responsável

| # | Pergunta | Recomendação |
| --- | --- | --- |
| 1 | Foto do destaque na metade direita ou no banner inteiro? | Decidir depois do pacote 1, vendo no stage; começar pela metade direita |
| 2 | O vídeo do destaque toca sozinho, sem som? | Sim, só no destaque que está na tela |
| 3 | Vídeo de até 6 segundos, trocando junto com o carrossel? | Sim |
| 4 | No máximo 2 destaques com vídeo ao mesmo tempo? | Sim |
| 5 | Com vídeo no banner, volta um botão de pausar? | Sim, aparecendo só quando o destaque da vez é um vídeo |

## Outras ideias próximas, ainda sem decisão

- O destaque usar sozinho a foto do produto escolhido como destino ([[22-Carrossel-de-Destaques]], seção "Em aberto").

Proposta completa do Codex, com os caminhos de arquivo: `docs/planejamento/midia-categorias-e-destaques-proposta-codex.md` (fora do repositório, na máquina do responsável).

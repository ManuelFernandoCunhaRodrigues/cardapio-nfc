# Redesign do cardápio do cliente — plano de testes do Claude Code

Data: 2026-10-12 · Pacote A da fase 2 (`feat/refatoracao-design`) · Base: `docs/design/refatoracao/especificacao.md` (seções 2, 3, 4, 7, 8 e 13).

Testes de navegador e de ponta a ponta, feitos no ambiente de desenvolvimento (banco do stage) e repetidos no stage depois do merge. O Codex valida esta lista antes da execução e propõe os testes unitários dele em `redesign-cliente-plano-codex.md`.

## Como

Servidor local (`npm run dev` e, para desempenho, `npm run build` + `npm run start -p 3100`). Viewports: 390×844 (principal), 360×640 e 1280×800. Leitura por árvore de acessibilidade, estilos computados e captura de tela comparada com `docs/design/refatoracao/telas/`.

## Casos

| # | Tela | O que verifico | Esperado |
| --- | --- | --- | --- |
| C1 | Todas as 4 listas | Cabeçalho compartilhado em `/`, `/cardapio`, `/busca`, `/info` | status à esquerda (link para `/info`), logo centralizada (centro da logo = centro da tela, ±1 px, com "Aberta" e com "Fechada"), botão de informações 44×44 à direita |
| C2 | Detalhe | `/produto/[id]` | não tem o cabeçalho compartilhado; tem botão voltar sobre a mídia |
| C3 | Tokens | cor de fundo do `body` e dos cartões | fundo `#FAF7EF`, cartões `#FFFFFF` |
| C4 | Fontes | `document.fonts` e pedidos de rede | só Poppins e Nunito Sans; nenhuma requisição de Anton ou JetBrains Mono |
| C5 | Início | banner | fundo escuro, última palavra do título em âmbar, banner inteiro clicável levando ao destino, imagem com `fetchpriority=high` só no primeiro |
| C6 | Início | "Mais pedidos" | card em pé (largura = (largura − 40) ÷ 2,5 → 140 px em 390), 2 inteiros + metade do terceiro; no fim da rolagem a metade fica à esquerda |
| C7 | Cardápio | faixas por categoria | mesmo card e mesmo corte; contagem "N itens" (singular "1 item") ao lado do título |
| C8 | Cardápio | chips | chip da seção visível marcado ao rolar; clicar no chip leva à âncora; com JavaScript desligado os chips seguem como links |
| C9 | Cardápio | produto indisponível | foto sem cor, selo INDISPONÍVEL, nome e preço em cinza, card ainda abre o detalhe |
| C10 | Detalhe | disponível e indisponível | "Disponível agora" em verde / "Indisponível no momento" em perigo; aviso "Consulta apenas…"; botão "Voltar ao cardápio" |
| C11 | Detalhe | vídeo ("Coixinha de Carne" tem vídeo no stage) | toca só depois do toque; com `prefers-reduced-motion: reduce` não entra em repetição sozinho |
| C12 | Busca | com resultado, sem resultado | grade de 2 colunas e contagem; vazio com o termo, botão "Ver cardápio completo" e atalhos de categoria |
| C13 | Info | aberta e fechada | cartão verde/perigo; dia de hoje marcado com "· hoje"; fechada por horário mostra dia + hora da próxima abertura; fechamento manual mostra "Fechada no momento"; ícone próprio do WhatsApp |
| C14 | Barra inferior | 4 abas | item ativo em pílula pêssego em cada rota; alvo ≥ 44 px |
| C15 | Acessibilidade | Tab real pelas 5 telas; contraste por estilos computados | ordem lógica, foco visível, setas decorativas fora da leitura de tela; texto ≥ 4,5:1 |
| C16 | Toque | chips, "Ver todos" e o card inteiro (a seta é decorativa) | área de toque ≥ 44 px mesmo quando o desenho é menor |
| C17 | 360×640 | Início e Cardápio | sem rolagem horizontal da página; nada cortado |
| C18 | Painel | `/admin/login` e, se houver sessão, o resumo | continua utilizável e legível (o pacote A não redesenha o painel) |
| C19 | Console e rede | as 5 telas | nenhum erro não tratado no console e nenhum 4xx/5xx nas rotas da própria aplicação (falha eventual de mídia externa é anotada à parte) |
| C20 | Desempenho | Lighthouse móvel em `/` e `/cardapio` no build de produção, sem nada rodando em paralelo | sinal comparativo com `docs/testes/lighthouse/` do Épico 5, não bloqueio; acessibilidade e ausência de regressão funcional são obrigatórias |
| C21 | Início | destaques | todos os destaques ativos alcançáveis por rolagem manual com encaixe e pontos; nenhum avanço automático neste pacote |
| C22 | Cards e detalhe | produto sem foto | marcador visual no card, no detalhe e no estado indisponível |
| C23 | Cards | clique em foto, nome, descrição e rodapé | qualquer ponto do card abre o detalhe |
| C24 | Início | faixa do segundo destaque | separada e clicável (sai no pacote do carrossel) |

## Validação do Codex

Feita em `redesign-cliente-validacao-codex.md` (2026-10-12). Aceitei tudo: entraram C21 a C24, a seta deixou de ser alvo em C16, C19 passou a separar falha da aplicação de falha de mídia externa e C20 virou sinal comparativo.

## Fora deste pacote

Painel (pacote B), carrossel automático dos destaques (aguardando o planejamento ser aprovado) e teste em celular real (fica com o responsável).

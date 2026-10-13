# Novo visual do cardápio, carrossel de destaques e melhorias de UX — resultados

Data: 2026-10-13 · Branch `feat/refatoracao-design` · Planos: `redesign-cliente-plano-claude.md`, `redesign-cliente-plano-codex.md`, `destaques-carrossel-plano-claude.md`, `destaques-carrossel-plano-codex.md` · Validações do Codex: `redesign-cliente-validacao-codex.md`, `destaques-carrossel-validacao-codex.md`.

## O que entrou

1. **Novo visual do cardápio do cliente** (pacote A da refatoração de design aprovada em 2026-10-12).
2. **Carrossel automático de destaques** (nota 22 do vault).
3. **Melhorias da revisão de UX no celular** para o cliente: nº 2 (aberta/fechada calculado no navegador), nº 3 (voltar ao mesmo lugar; busca lembra o termo), nº 8 (banner sem corte; preço visível em 360×640), nº 10 ("Mais de …" no detalhe, indisponíveis no fim da faixa, busca por nome de categoria) e acabamentos.

O painel não mudou de visual neste pacote; só `/admin/destaques` ganhou contador e aviso.

## Verificações automáticas

`npm run lint`, `npm run typecheck`, `npm run test` (31 arquivos, 156 testes) e `npm run build`: tudo passou em 2026-10-13. Rotas `/`, `/cardapio`, `/busca` e `/info` continuam estáticas com revalidação de 1 minuto.

## Testes de navegador

Feitos com Edge sem janela (puppeteer-core, fora do repositório), emulando celular com toque em 390×844 e 360×640 e computador em 1280×800, contra o servidor de desenvolvimento e contra o build de produção local (`next start`), os dois ligados ao banco do stage. Dados: 4 destaques ativos no stage (2 já existiam; criei "Combo da tarde" e "Pastel na hora" como exemplo), 11 produtos, 1 indisponível, 1 com vídeo.

### Novo visual (C1–C24)

| Caso | Resultado |
| --- | --- |
| C1 cabeçalho | Igual nas 4 telas; centro da logo em 195,0 px de 390; pílula leva a `/info`; botão de informações 44×44 |
| C2 detalhe | Sem o cabeçalho compartilhado; botão voltar sobre a mídia |
| C3 cores | Fundo `rgb(250,247,239)`, cartões brancos |
| C4 fontes | Só Poppins e Nunito Sans; 4 arquivos de fonte |
| C5 banner | Fundo escuro, última palavra em âmbar, banner inteiro é o link, nenhum controle dentro do link |
| C6 e C7 cards | 140×242 em 390 px (128 em 360); 2 inteiros + metade do terceiro; no fim da rolagem a metade fica à esquerda; contagem "4 itens" / "1 item" |
| C8 chips | Tocar no chip leva à âncora e marca o chip. Ao rolar até o fim da página fica marcado o primeiro chip visível (as últimas seções não chegam ao topo) — aceito |
| C9 e C22 | Indisponível em cinza com selo; produto sem foto mostra a coxinha da casa (card, detalhe e indisponível) |
| C10 detalhe | "Disponível agora" / "Indisponível no momento — Pergunte ao atendente quando volta."; aviso de consulta; botão "Voltar" |
| C11 vídeo | Só toca depois do toque; com redução de movimento fica sem repetição e sem início automático, com os controles do navegador |
| C12 busca | Grade de 2 colunas e contagem; vazio com o termo, "Ver cardápio completo" e atalhos de categoria |
| C13 info | "Fechada · Abre terça às 08:00" (testado à 00h de terça); "Terça · hoje" marcado. Endereço e contatos não aparecem porque o stage não tem esses dados |
| C14 barra | Aba ativa correta em cada rota; alvos de 94×72 |
| C15 teclado | Ordem lógica; foco visível em todos os 14 primeiros elementos; destaques fora de vista ficam fora do Tab |
| C16 toque | "Ver todos" 88×44; chips com área estendida; card inteiro abre o detalhe |
| C17 360×640 | Sem rolagem lateral em Início e Cardápio |
| C19 | Nenhum erro no console e nenhum 4xx/5xx |
| C21, C23 | Todos os destaques alcançáveis; tocar em qualquer ponto do card abre o detalhe |
| C24 | Não se aplica mais: a faixa do segundo destaque saiu com o carrossel |

### Carrossel (K1–K15)

| Caso | Resultado |
| --- | --- |
| K1 | Trocas a cada 6 s (medido: 0 → 1 → 2 → 3 → 0, intervalos de 6,0 a 6,3 s) |
| K2 | Ponto leva ao destaque; rótulo "Ir para destaque 2 de 4"; alvo 24×44; a contagem recomeça dali (5,5 s) e o toque não deixa o carrossel preso |
| K3 | Pausado: nenhuma troca em 13 s; rótulo alterna entre "Pausar" e "Retomar rotação automática"; fora do link; 44×44 |
| K4 | Pausa com mouse em cima (8 s), com foco de teclado (13 s), com a aba oculta (8 s, `document.hidden` verdadeiro, por troca de aba automatizada) e com o banner fora da tela (13 s); retoma em todos |
| K5 | Arrastar troca o destaque, atualiza o ponto e a contagem recomeça |
| K6 | Com redução de movimento: nenhuma troca em 13 s; ponto manual funciona |
| K7 | 0 destaques: banner padrão sem controles; 1: sem pontos, sem botão, sem troca; 4: pontos; 6: contador "1 de 6" |
| K8 | Setas escondidas em 390 px; no computador aparecem ao passar o mouse e trocam o destaque |
| K9 | Um link por destaque; destaques fora de vista ficam inertes |
| K10 | Região "Destaques da casa", descrição "carrossel", itens "N de M"; nada anunciado na troca automática; "Destaque 3 de 4" ao tocar no ponto |
| K11 | A faixa "Em destaque" não existe mais |
| K12 | Altura fixa (208 px; 148 px em telas com menos de 700 px de altura). Prioridade de imagem não pôde ser medida: nenhum destaque do stage tem imagem |
| K13 | Sem JavaScript (build de produção): os 4 destaques são links, a faixa rola com encaixe, sem controles |
| K15 | Nenhum erro no console |

Sobreposição conferida em 390 e 360 px com 4 e 6 destaques: pontos/contador não encostam no botão de pausar nem no "Conferir".

### Melhorias de UX

| Nº | Resultado |
| --- | --- |
| 2 | Com o relógio do navegador adiantado sobre a página estática: 10h e 14h de terça mostram "Aberta", 20h mostra "Fechada" — o status segue o relógio de quem abre, não a cópia guardada |
| 3 | Do cardápio (rolado a 850 px) ao produto e de volta: mesma rolagem (850). Da busca por "coxinha" ao produto e de volta: `/busca?q=coxinha`, campo preenchido, 5 resultados |
| 8 | "Conferir" termina 13 px antes do fim do banner em 390 px e 15 px em 360×640; em 360×640 o preço do primeiro card aparece acima da barra inferior |
| 10 | "Mais de Pastéis" no detalhe; indisponível no fim da faixa; busca por "drinks" traz os 2 produtos da categoria |

## Defeitos achados nos testes e corrigidos

- Fundo escuro do banner não era gerado pelo Tailwind (cor e degradê no mesmo valor) — separado em duas classes.
- Marcador de produto sem foto era um borrão — trocado pela coxinha das telas aprovadas (`coxinha-art.tsx`); destaque sem imagem mostra a arte do banner.
- `role="listitem"` estava no próprio link do card (apagava o papel de link).
- Carrossel: passo da rolagem ignorava o espaço entre os slides; pausa ficava presa depois de um toque (mouse emulado e foco); pontos de 44 px de largura não cabiam (até 5 destaques ficam pontos, acima disso contador).
- Busca: voltar do produto apagava o termo; texto "Nenhum resultados".
- **Sem JavaScript o cardápio mostrava só a barra inferior** — defeito antigo, também no stage de hoje: o `loading.tsx` das listas fazia o conteúdo vir escondido. Arquivo removido; a busca voltou a ser página estática lendo o termo no navegador.

## Não testado ou em aberto

- C20 (Lighthouse): não rodado.
- K14 (contador e aviso em `/admin/destaques`): coberto por teste unitário (8 e 9 ativos) e leitura do código; não vi no navegador porque exige login no painel.
- Leitor de tela real (TalkBack/VoiceOver) e celular real: não testados.
- Imagens de destaque (prioridade e carregamento sob demanda): o stage não tem destaque com imagem.
- Voltar para o cardápio depois de usar um chip devolve ao início da categoria do chip, não ao ponto exato da rolagem.

# Carrossel automático de destaques — plano de testes do Claude Code

Data: 2026-10-12 · Branch `feat/refatoracao-design` · Base: nota `22-Carrossel-de-Destaques` do vault (aprovada pelo responsável em 2026-10-12).

Testes de navegador no ambiente de desenvolvimento (banco do stage) e de novo no stage depois do merge. O Codex valida esta lista e propõe os unitários dele (temporizador simulado) em `destaques-carrossel-plano-codex.md`. Os unitários da seção 8 da proposta de planejamento já foram lidos e aceitos por mim.

Dados: o stage precisa de pelo menos 3 destaques ativos para os casos de troca. Confiro a quantidade por SQL antes; se faltar, crio destaques de teste pelo painel do stage com o responsável logado ou por SQL no stage, e registro aqui o que foi criado.

| # | O que verifico | Esperado |
| --- | --- | --- |
| K1 | Página parada por 6 s, medindo o índice ativo e a posição da rolagem | troca para o destaque 2 em 6 s (±0,5 s); depois do último volta ao primeiro |
| K2 | Pontinhos | o ponto ativo acompanha a troca automática e a rolagem manual; clicar no ponto N leva ao destaque N; rótulo "Ir para destaque N de M"; alvo de toque ≥ 44 px |
| K3 | Botão pausar/retomar | visível com 2 ou mais destaques; pausado, nada troca em 13 s; rótulo alterna entre "Pausar rotação automática" e "Retomar rotação automática"; não está dentro do link do banner |
| K4 | Pausas implícitas | não troca enquanto o ponteiro está sobre o banner, enquanto o foco do teclado está dentro do carrossel, com a aba oculta (`visibilitychange`) e com o banner fora da tela; retoma quando a condição acaba |
| K5 | Toque e arraste | arrastar pausa; soltar em outro destaque atualiza o ponto e reinicia a contagem a partir dali |
| K6 | `prefers-reduced-motion: reduce` | nenhuma troca automática; pontos e rolagem manual funcionam |
| K7 | Quantidades | 0 destaques: banner padrão, sem controles; 1: sem pontos, sem botão, sem temporizador; 3 ou mais: tudo ativo |
| K8 | Setas | invisíveis em 390 px; em 1280 px aparecem ao passar o mouse ou focar e trocam o destaque |
| K9 | Link | o banner inteiro leva ao destino; nenhum link dentro de link; destaques fora de vista não entram na ordem do Tab |
| K10 | Leitor de tela | região com rótulo "Destaques da casa" e descrição de carrossel; cada item com "N de M"; nenhum anúncio na troca automática; anúncio educado ao trocar por ponto ou seta |
| K11 | Faixa repetida | a faixa "Em destaque" não existe mais abaixo de "Mais pedidos" |
| K12 | Imagens | só a primeira com prioridade; as demais com carregamento sob demanda; altura do banner fixa (sem salto de layout na troca) |
| K13 | Sem JavaScript | a faixa rola com o dedo e cada banner é um link; controles não aparecem |
| K14 | Painel `/admin/destaques` | contador "N ativos de M destaques"; aviso só com mais de 8 ativos; criar além disso continua permitido |
| K15 | Console e rede | nenhum erro; nenhum temporizador ativo depois de sair da página |

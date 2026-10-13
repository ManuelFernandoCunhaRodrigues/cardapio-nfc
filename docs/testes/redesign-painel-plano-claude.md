# Redesign do painel — plano de testes do Claude Code

Data: 2026-10-13 · Pacote B da refatoração de design (`feat/refatoracao-painel`) · Base: `docs/design/refatoracao/especificacao.md` (telas 06 a 12, seções 7 e 8) e `docs/design/revisao-ux-mobile-2026-10.md` (melhorias 1, 4, 5, 6, 7, 9, 11 e 12, todas aprovadas pelo responsável em 2026-10-12).

O painel exige login. Eu não digito senha: os testes de navegador dependem de o responsável entrar no painel (no navegador do aplicativo, no ambiente de desenvolvimento ou no stage). O que não der para ver assim fica coberto por teste unitário e por leitura do código, e é dito no relatório. O Codex valida esta lista e propõe os unitários dele em `redesign-painel-plano-codex.md`.

Viewports: 390×844 (principal), 360×640 e 1440×900.

| # | Tela | O que verifico | Esperado |
| --- | --- | --- | --- |
| P1 | Login | visual novo; olho para mostrar a senha; erro neutro; envio duplo travado | logo centralizada; botão alterna o tipo do campo e tem rótulo acessível; mesma mensagem para e-mail ou senha errados |
| P2 | Casca do painel | cabeçalho com logo no celular; menu lateral com logo no computador; ícones no lugar dos símbolos; item ativo | igual às telas 07 e 10; barra inferior some em `/admin/produtos/novo` e `/admin/produtos/[id]` e só nelas |
| P3 | Abrir/fechar a loja | pílula do topo | dois toques (abrir a folha, confirmar); o cardápio público reflete em até 1 minuto; ação registrada na auditoria |
| P4 | Resumo | 4 números; "Precisam de atenção"; "Loja hoje" no computador; atalhos | números batem com o banco; produto indisponível E sem foto aparece uma vez com as duas etiquetas; número leva à lista já filtrada |
| P5 | Produtos | busca, chips de categoria, filtros Indisponíveis / Sem foto / Desativados | filtros combinam; contagem certa; cartão inteiro abre a edição |
| P6 | Situação do produto | controle único: No cardápio · Em falta hoje · Escondido | grava `is_active`/`is_available` corretos; o cardápio público reflete; estado de carregamento e rótulo acessível |
| P7 | Menu "⋯" e ordem | subir, descer, excluir; ordem por categoria | confirmação antes de excluir; "Excluir" longe de ações de toque frequente |
| P8 | Novo produto com foto e vídeo | um passo só | escolho foto e vídeo antes de salvar; andamento em etapas (salvando, foto, vídeo); botão travado até terminar; segundo toque não cria produto em dobro; falha no vídeo não perde o produto nem a foto e diz o que fazer |
| P9 | Edição de produto | foto e vídeo no topo; Salvar fixo; sair sem salvar | aviso ao sair com mudanças; "Ver no cardápio" abre o produto público |
| P10 | Avisos | salvar, erro, ação rápida | aviso visível e anunciado (`aria-live`); erro de ação rápida não fica só em dica de mouse |
| P11 | Categorias e Destaques | editor em folha; destino do destaque como escolha | "Editar" abre a folha na frente; destino: cardápio, uma categoria, um produto ou endereço próprio; grava o mesmo campo `target` |
| P12 | Loja | horários em uma linha por dia; copiar para todos os dias; Salvar fixo | sem rolagem lateral em 390 e 360; valores gravados iguais aos de hoje |
| P13 | Textos | sem "slug", "WebP", "fallback", "rota" | português de balcão em rótulos, ajudas e erros |
| P14 | Acessibilidade | Tab real; foco preso na folha aberta e devolvido ao fechar; contraste; alvos ≥ 44 px | sem armadilha de teclado; Esc fecha a folha |
| P15 | Permissões | sessão sem perfil admin; sessão expirada no meio de uma ação | mesma proteção de hoje (nada novo acessível sem admin) |
| P16 | Regressão do cardápio | `/`, `/cardapio`, `/produto/[id]`, `/busca`, `/info` | nada do pacote do cliente mudou |
| P17 | Console e rede | todas as telas | sem erro não tratado; sem 4xx/5xx inesperado |

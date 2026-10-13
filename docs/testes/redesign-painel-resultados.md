# Novo visual do painel e melhorias de UX — resultados

Data: 2026-10-13 · Branch `feat/refatoracao-painel` · Planos: `redesign-painel-plano-claude.md` (P1–P17) e `redesign-painel-plano-codex.md` · Validação do Codex: `redesign-painel-validacao-codex.md`.

## O que entrou

Visual aprovado do painel (telas 06 a 12) e as melhorias 1, 4, 5, 6, 7, 9, 11 e 12 da revisão de UX no celular. Sem migration. Duas actions novas, no padrão das existentes: `setProductSituation` e `updateStoreStatusOverride`.

## Verificações automáticas

`npm run lint`, `npm run typecheck`, `npm run test` (165 testes) e `npm run build` passaram em 2026-10-13.

## Testes de navegador

Feitos no navegador do aplicativo, no ambiente de desenvolvimento ligado ao banco do stage, com o responsável logado como administrador (eu não digito senha). Ele autorizou criar e apagar um produto de teste, alterar um destaque e abrir e fechar a loja. Cada gravação foi conferida no banco. Viewports: 390×844, 360×640 e 1440×900.

| Caso | Resultado |
| --- | --- |
| P1 login | Visual novo com a logo, campos e o olho da senha. Erro de login e envio duplo não foram exercitados (exigiriam digitar senha) |
| P2 casca | Cabeçalho com logo no celular; menu lateral escuro com logo em 1440 px; barra inferior some em `/admin/produtos/novo` e na edição; item ativo certo |
| P3 loja em dois toques | Pílula → folha → "Abrir loja agora": `status_override = open`, auditoria gravada, pílula "Aberta" e aviso. "Voltar a seguir os horários": `auto`. Esc fecha a folha e o foco volta à pílula |
| P4 resumo | 11 ativos, 1 indisponível, 10 sem foto, 6 categorias (conferem com o banco); cada número leva à lista filtrada; "Precisam de atenção" com "Ver todos (10)"; atalhos antes da lista no celular; "Loja hoje" no computador |
| P5 produtos | Filtros por endereço (`?filtro=indisponiveis`, `sem-foto`, `desativados`) com contagens certas; chips de categoria; busca; altura da lista caiu de 3.233 px para 2.285 px |
| P6 situação única | Produto de teste: "Escondido" na criação (`is_active = false`), depois "Em falta hoje" pela lista (`is_active = true`, `is_available = false`), com auditoria |
| P7 menu "⋯" e exclusão | Menu abre por cima dos cartões vizinhos; subir e descer por categoria; excluir pede confirmação com foco em "Cancelar"; produto e auditoria conferidos no banco |
| P8 novo produto | Criado **sem mídia**: andamento, redirecionamento para a edição e aviso "Produto criado com sucesso". Foto e vídeo em um passo **não testados** (o navegador do aplicativo não envia arquivos) |
| P9 edição | Mídia no topo, Salvar fixo, botão de ver no cardápio; altura do formulário caiu de 2.879 px para 1.474 px. O aviso de sair sem salvar não foi disparado (usa a janela nativa do navegador) |
| P10 avisos | Aviso anunciado ao criar produto, mudar a loja e salvar destaque |
| P11 destaques e categorias | Editor em folha com foco dentro; Esc fecha e devolve o foco; destino como escolha — "Um produto" gravou `/produto/<id>` e reabriu selecionado; contador "4 ativos de 4" |
| P12 loja | Sem rolagem lateral em 390 e 360 px; uma linha por dia; hora inteira visível; Salvar fixo. Não salvei alterações de horário |
| P13 textos | Sem "slug", "WebP", "fallback" ou "rota" nas telas vistas |
| P14 acessibilidade | Nenhum controle sem nome nas telas vistas; nenhum alvo menor que 44 px nas listas; folhas com `aria-modal` |
| P17 | Nenhum erro de execução no console |

Dados do stage ao final: 11 produtos (o de teste foi excluído), loja em `auto`, 4 destaques ativos. O destaque de exemplo "Pastel na hora" ficou apontando para o produto Pastel de carne.

## Defeitos achados e corrigidos

Menu "⋯" por baixo do cartão seguinte; caixas ocultas sem nome no formulário de produto; miniatura do destaque sem nome; "Precisam de atenção" cortada em 8 sem aviso e atalhos depois da lista; ações rápidas sem aviso e com perda de foco; foco não voltava à pílula da loja; folha continuava aberta depois de salvar; hora cortada em 390 px; etapas da criação todas marcadas de uma vez; "Ver todos" apontando para o filtro com menos itens; hover do botão principal sem contraste.

## Não testado

- **Foto e vídeo em um passo só** e as falhas parciais (só teste unitário da sequência).
- Aviso de sair sem salvar; erro de login; sessão expirada; usuário sem perfil de administrador (P15).
- Aviso de sucesso depois de excluir pela lista (corrigido depois do teste; não repeti a exclusão).
- Aviso acima de 8 destaques ativos (só teste unitário).
- Leitor de tela real e celular real.

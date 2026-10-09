# Plano de testes — correções pós-reteste do Épico 4

Este é somente o plano da etapa 3. Os testes descritos abaixo não devem ser escritos nem executados até a validação do Claude Code.

## Cobertura proposta pelo Codex

### C1 — Barra Salvar não disputa toque com a navegação inferior

- Tipo: navegador, 375×812, toque físico/por coordenada.
- Objetivo: provar que a barra Salvar de produto e de destaque não fica sob as abas do painel.
- Passos: abrir `/admin/produtos/novo` e `/admin/destaques`; obter o centro do botão Salvar e usar clique por coordenada; inspecionar `document.elementFromPoint` nesse centro; rolar até o último campo.
- Resultado esperado: `elementFromPoint` é o botão Salvar ou seu conteúdo, nunca uma aba; o clique envia o formulário; último campo fica acima da barra e da safe-area; abas continuam operáveis fora da área da barra.
- Por que comprova a ideia: valida a zona do polegar e o formulário utilizável em tela cheia exigidos pela nota 05.

### C2 — Redirecionamento após criar produto

- Tipo: navegador; unitário opcional se a lógica de montagem da URL for extraída no futuro.
- Objetivo: impedir duplicação de produto e liberar o gerenciamento de vídeo sem reabrir a tela.
- Passos: criar produto válido em `/admin/produtos/novo`, com e sem foto; aguardar a conclusão.
- Resultado esperado: URL final é `/admin/produtos/<uuid>?criado=1`; a tela é de edição, mostra confirmação “Produto criado com sucesso” e o link “Ver no cardápio”; campos não são limpos em uma página “novo”.
- Por que comprova a ideia: confirma que o fluxo pós-criação deixa o produto em estado seguro para continuidade da operação.

### C3 — Primeiro toque inicia vídeo

- Tipo: navegador, com instrumentação de `HTMLMediaElement.play` e Network.
- Objetivo: garantir que o gesto no play cria o vídeo e inicia sua reprodução sem segundo toque.
- Passos: abrir detalhe de produto com vídeo, observar Network antes do play; tocar no botão; após até 2 s ler `currentTime`, `paused` e chamadas a `play`.
- Resultado esperado: zero requisições de vídeo antes do toque; após o toque, `play()` é chamado, `currentTime > 0` e o vídeo não permanece pausado. A preferência de movimento reduzido não bloqueia esse gesto explícito.
- Por que comprova a ideia: preserva carregamento sob demanda e torna o vídeo um complemento funcional, conforme a nota 04.

### C4 — Remoções usam modal do painel

- Tipo: navegador.
- Objetivo: eliminar `window.confirm` e aplicar confirmação consistente à foto/vídeo de produto e à imagem de destaque.
- Passos: abrir cada ação Remover; interceptar `window.confirm`; selecionar Cancelar, depois repetir e selecionar a confirmação destrutiva.
- Resultado esperado: `window.confirm` não é chamado; modal acessível é aberto; Cancelar mantém registro e Storage; confirmar chama a action correta e atualiza a prévia/estado.
- Por que comprova a ideia: “Exclusão sempre passa por modal de confirmação” evita ações irreversíveis acidentais.

### C5 — Foco e ciclo do ConfirmDialog

- Tipo: navegador; unitário de DOM é opcional se o ambiente de testes ganhar `jsdom`.
- Objetivo: validar foco inicial, focus trap, Escape e restauração do gatilho.
- Passos: abrir cada modal a partir do teclado; ler `document.activeElement`; pressionar Tab/Shift+Tab repetidamente; fechar com Escape e com Cancelar.
- Resultado esperado: foco inicial no botão Cancelar; Tab circula apenas pelos controles do modal, ignorando campo hidden; Escape/Cancelar fecham o modal e devolvem foco ao botão que o abriu.
- Por que comprova a ideia: confirma operação por teclado e previne perda de contexto para quem usa tecnologia assistiva.

### C6 — Erro de foto não mantém progresso concluído

- Tipo: navegador; unitário futuro possível ao extrair máquina de estados de upload.
- Objetivo: mostrar que falha de validação/servidor não é comunicada como 100% concluído.
- Passos: selecionar imagem 300×300 e, separadamente, simular resposta de erro ao enviar foto existente.
- Resultado esperado: barra desaparece ou zera; mensagem de erro clara permanece; não há texto “100%”; nenhuma atualização é feita no banco/Storage no primeiro caso.
- Por que comprova a ideia: feedback de progresso deve refletir o estado real e orientar a pessoa a corrigir o arquivo.

### C7 — Alvos interativos de 44 px no painel mobile

- Tipo: navegador com auditoria de caixas visíveis a 375 px.
- Objetivo: cobrir links e botões visíveis, incluindo cabeçalho, navegação, Voltar, card de prévia e ações de mídia.
- Passos: visitar `/admin`, `/admin/produtos`, `/admin/produtos/novo`, `/admin/destaques` e `/admin/categorias`; para cada `a`, `button`, `input` e `select` visível, medir `getBoundingClientRect`.
- Resultado esperado: largura e altura úteis não são menores que 44 px; exceções sem interação direta devem ser documentadas, não ignoradas silenciosamente.
- Por que comprova a ideia: garante o requisito explícito de toque da nota 05 no contexto real do painel.

## Validação do plano de reteste do Claude Code

### R-N1 — APROVADO

Clique por coordenada e `elementFromPoint` são adequados para detectar sobreposição real de camadas. Acrescentar a verificação no formulário de destaque, pois ele também possui Salvar fixo.

### R-N7 — APROVADO

`currentTime > 0` em até 2 s e zero requisições antes do gesto testam exatamente carregamento sob demanda e reprodução no primeiro toque. Registrar também que `paused` é falso ajuda a diagnosticar mídia sem frames decodificáveis.

### R-N9 — APROVADO COM AJUSTE

Cobrir remoção de imagem de destaque além de vídeo/foto do produto, pois as três ações devem usar o mesmo modal. Para cada uma, conferir que a prévia só muda após Confirmar.

### R-A11y — APROVADO

Foco inicial em Cancelar, ciclo com Tab/Shift+Tab, Escape e retorno ao gatilho formam o conjunto correto. Verificar que o campo hidden não entra no ciclo.

### R-N5 — APROVADO

Imagem de 300 px deve apresentar erro sem “100%”. Incluir erro retornado pela action de upload para cobrir a outra rota que antes fixava o progresso em 100%.

### R-44 — APROVADO COM AJUSTE DE ESCOPO

Medir somente elementos interativos visíveis e acionáveis; labels de texto ou elementos sem comportamento não são alvos. Incluir o card de prévia em `/admin/produtos/novo`, onde havia link de 32 px.

### Regressão completa — APROVADO

Lint, typecheck, Vitest e build devem rodar após a aprovação deste plano. Nesta etapa foram executados somente lint e typecheck, conforme o protocolo.

## Complemento da etapa 4 — modal em portal e retorno de foco

### C8 — Modal de mídia não cria formulário aninhado

- Tipo: navegador, 375×812.
- Objetivo: confirmar que os modais de remoção de vídeo/foto de produto e imagem de destaque ficam fora dos formulários de edição.
- Passos: abrir os modais em `/admin/produtos/novo`, `/admin/produtos/<id>` e `/admin/destaques`, incluindo editor de destaque aberto; executar `document.querySelectorAll('form form').length` antes e durante cada modal.
- Resultado esperado: contagem sempre igual a zero. Com o modal aberto, seu `form` é filho de `document.body` via portal, não do formulário de produto/destaque.
- Por que comprova a ideia: evita submissão capturada pelo formulário externo e permite que a Server Action destrutiva receba seus próprios campos.

### C9 — Confirmação de mídia envia a action correta

- Tipo: navegador, toque real por coordenada e verificação de banco/Storage no staging.
- Objetivo: confirmar que remover vídeo e foto voltou a funcionar sem enviar o formulário de edição.
- Passos: em produto exclusivo com foto e vídeo, abrir Remover vídeo, confirmar “Excluir de vez”, aguardar; repetir para foto. Em cada modal, repetir o fluxo com Cancelar antes da confirmação final.
- Resultado esperado: Cancelar fecha o modal sem mudança; confirmar remove primeiro `video_path` e objeto de vídeo, depois `image_path` e variantes de foto; modal fecha e a prévia/estado são atualizados. Não há navegação, submit ou validação do formulário de produto.
- Por que comprova a ideia: valida o protocolo seguro de remoção e a separação entre formulário editorial e ação destrutiva.

### C10 — Retorno de foco resiliente

- Tipo: navegador.
- Objetivo: restaurar foco ao gatilho mesmo após o portal desmontar e o componente sofrer re-render.
- Passos: abrir o modal a partir do botão Remover vídeo/foto e de Excluir em lista; fechar com Escape e, em outra tentativa, com Cancelar; aguardar um frame de renderização e ler `document.activeElement`.
- Resultado esperado: `document.activeElement` é o mesmo gatilho (ou sua instância re-renderizada com o mesmo id) em todos os fechamentos não destrutivos.
- Por que comprova a ideia: preserva o contexto de teclado e atende o comportamento de modal esperado pela nota 18.

Não proponho teste Vitest adicional nesta etapa: o projeto usa ambiente Vitest `node`, sem DOM/`jsdom`, e portal, foco e formulários aninhados são propriedades que o navegador real mede de forma mais fiel.

## Validação do reteste da etapa 4

### R-N9b — APROVADO

Toque real, confirmação, verificação de banco/Storage e o cenário Cancelar cobrem o defeito que impedia a action de mídia. Aplicar ao vídeo e à foto, nessa ordem, em produto exclusivo.

### R-A11y-b — APROVADO

Verificar retorno ao gatilho após Escape e após Cancelar é o critério correto. A leitura deve ocorrer após pelo menos um frame, pois o portal precisa desmontar antes do foco definitivo.

### R-forms — APROVADO

Exigir `document.querySelectorAll('form form').length === 0` nas três telas, incluindo o editor de destaque e o modal aberto, detecta tanto a regressão de mídia quanto futuros usos indevidos de `ConfirmDialog` dentro de formulário.

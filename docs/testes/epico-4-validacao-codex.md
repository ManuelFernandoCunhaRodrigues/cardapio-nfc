# Validação do plano de testes do Claude Code — Épico 4

Validação feita contra as notas 04, 05, 08 e 14 do vault e contra a implementação atual. Os testes de banco/Storage devem ser feitos somente em `SALGAE-STAGING`, com limpeza dos dados de teste ao final.

## Banco e Storage

### B1 — APROVADO

Os limites e MIME types propostos correspondem à migration: imagens públicas finais apenas WebP até 1 MB e vídeos MP4/WebM até 10 MB. Conferir valores em bytes (1.048.576 e 10.485.760) evita ambiguidade de MB/MiB.

### B2 — APROVADO

Inserção como `anon` deve ser bloqueada por RLS em todos os buckets. É uma verificação necessária porque URL pública não autoriza escrita.

### B3 — APROVADO

Usuário autenticado sem perfil administrativo também deve ser bloqueado. A policy precisa depender de `private.is_admin()`, não apenas de `authenticated`.

### B4 — APROVADO

Admin deve conseguir inserir e apagar objeto temporário, com rollback/limpeza ao fim. Isso valida a sessão usada pelas Server Actions sem recorrer a `service_role`.

### B5 — APROVADO COM AJUSTE OBRIGATÓRIO INCORPORADO

O caso correto é: **URL pública responde 200 para anônimo e listagem por `anon` é bloqueada**. Bucket público serve o objeto pela URL pública sem policy `SELECT` em `storage.objects`; permitir `SELECT to public` permitiria enumerar objetos. A migration foi corrigida para `SELECT` somente de administrador autenticado.

### B6 — APROVADO COM ESCOPO EXPLÍCITO

Após uma troca bem-sucedida de foto/vídeo dos fixtures criados pelo teste, a pasta `products/<id>/` deve conter apenas os objetos correntes. O teste deve usar um produto exclusivo e não deve afirmar que consegue detectar órfãos históricos ou objetos de upload cancelado fora daquele fluxo.

## Navegador — painel no celular

### N1 — APROVADO

Cobrir 375×812, chips, teclado decimal, prévia, progresso, barra Salvar fixa e mensagem com link público confirma o fluxo prioritário de atendimento pelo celular.

### N2 — APROVADO

Além de maior lado, MIME, proporção e ausência de EXIF/GPS, registrar o tamanho real das variantes. “Perto das metas” deve ser interpretado como meta de compressão, não falha se uma imagem ruidosa permanecer acima dela em qualidade 70, conforme a nota 08.

### N3 — APROVADO

A comparação visual em DPR 3 complementa o PSNR automatizado. A avaliação deve ocorrer no tamanho de uso (card de 156 px e detalhe de 260 px), não ampliando artificialmente o arquivo.

### N4 — APROVADO

A fixture orientation 6 deve aparecer em pé tanto na prévia quanto nas páginas públicas. Confirmar isso na interface protege a etapa de `rotate()` que pode passar despercebida em inspeção de dimensões apenas.

### N5 — APROVADO

Rejeições devem ocorrer antes de persistir o objeto e o campo no banco. Incluir a confirmação de que a imagem acima de 15 MiB usa o mesmo limite `15 * 1024 * 1024` do cliente e servidor.

### N6 — APROVADO

A troca deve exibir a nova foto após revalidação e remover as duas variantes antigas somente após o registro apontar para a base nova. B6 confirma o efeito no Storage.

### N7 — APROVADO

O teste deve verificar no Network que a listagem não baixa o vídeo e que a requisição ocorre somente após a pessoa acionar play no detalhe. A foto precisa permanecer como poster/fallback.

### N8 — APROVADO

Duração e tamanho devem falhar no cliente antes de pedir/enviar URL assinada. Conferir também que não surge `video_path` no banco.

### N9 — APROVADO

A sequência correta é remover o vídeo antes da foto, com confirmação para ambos. Depois da foto removida, validar fallback público e a impossibilidade de associar vídeo sem nova foto.

### N10 — APROVADO

Criar, ordenar e desativar destaque com destino interno testa CRUD editorial, a imagem WebP e a leitura pública de `highlights`. Confirmar que o banner respeita `sort_order` e não só a ordem de criação.

### N11 — APROVADO

Teste manual de overflow, alvos de 44 px, alcance do polegar e foco/Escape do modal é apropriado; incluir também a safe-area física ou emulação de iPhone para a barra Salvar fixa.

### N12 — APROVADO COM AJUSTE NECESSÁRIO

N1–N10 não excluem produto nem destaque, portanto não podem esperar logs `delete` dessas entidades. Acrescentar, ao fim e em fixtures isolados, exclusão confirmada de um produto e de um destaque, ou limitar o esperado aos eventos realmente executados. Cada mutação deve ter `actor_id`, `entity`, `entity_id` e ação correspondente.

## Regressão

### R1 — APROVADO

Lint, typecheck, testes e build são regressão adequada. Nesta etapa o Codex executa Vitest, ESLint e TypeScript; o build pode ser executado pelo Claude Code no ambiente de homologação após estes comandos.

### R2 — APROVADO

As rotas públicas listadas devem manter os estados do Épico 2. Conferir mídia real e ausência de regressão nas imagens legadas/fallbacks amplia corretamente o escopo de regressão.

### R3 — APROVADO

Produto legado sem foto deve renderizar o componente de fallback e não gerar erro de URL/console. Isso valida a compatibilidade de dados existentes.

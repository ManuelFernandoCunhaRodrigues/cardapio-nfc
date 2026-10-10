# Plano de testes — Épico 4 (proposta para validação do Claude Code)

Este documento é apenas o plano. Nenhum dos testes abaixo deve ser escrito ou executado antes da validação do Claude Code. A ideia é cobrir as regras do vault, não apenas obter cobertura de linhas.

## Convenções e fixtures

- Usar Vitest para testes unitários e de integração isolada, sem acesso à rede ou a um projeto Supabase real.
- Gerar imagens em memória com `sharp`: JPEG/PNG/WebP de 400×400, 399×800, 3200×1800, 300×300 e uma imagem com EXIF de orientação e GPS. Não versionar arquivos binários.
- O limite de 15 MB significa exatamente `15 * 1024 * 1024` bytes (15 MiB), tanto no cliente quanto no servidor.
- Para tamanho-alvo, gerar em memória uma foto pseudo-aleatória/ruidosa e uma foto uniforme; assim se exercitam tanto várias tentativas de qualidade quanto a primeira tentativa bem-sucedida.
- Representar Storage e Supabase por fakes tipados que registram a ordem de `upload`, `update`, `select` e `remove`; o fake deve permitir injetar falha em cada etapa.
- Para vídeo, criar `File` em memória e simular o elemento `video`/`URL.createObjectURL`, controlando `duration`, erro de metadata e progresso de XHR.

## Testes unitários

### 1. Dimensões do redimensionamento no cliente

- Objetivo: garantir o limite de 2048 px no maior lado sem deformar nem ampliar.
- Entrada: dimensões 4000×2000, 2000×4000, 2048×1200 e 300×200.
- Resultado esperado: 2048×1024, 1024×2048, 2048×1200 e 300×200, respectivamente.
- Por que comprova a ideia: confirma a primeira etapa obrigatória do algoritmo da nota 08 e evita ampliar fotos pequenas, o que pioraria a aparência no celular.

### 2. Sequência e piso da qualidade WebP

- Objetivo: assegurar a sequência adaptativa 82 → 76 → 70 e o piso de 70.
- Entrada: tamanhos codificados que já atingem a meta na primeira, na segunda, na terceira e em nenhuma tentativa.
- Resultado esperado: a escolha é 82, 76, 70 e 70, respectivamente; a lista de candidatos é exatamente `[82, 76, 70]`.
- Por que comprova a ideia: impede uma futura regressão que reduza qualidade abaixo de 70 para economizar bytes e gere artefatos visíveis.

### 3. Compressão gera variantes nas dimensões corretas após rotação

- Objetivo: verificar `detail` e `card` com orientação corrigida, sem ampliação e sem metadados preservados.
- Entrada: JPEG 3200×1800 com EXIF orientation 6 e JPEG 800×600.
- Resultado esperado: depois da rotação, o JPEG 3200×1800 fica em pé; `detail` é exatamente 900×1600 e `card` 360×640. Para 800×600, `detail` continua 800×600 e `card` reduz para 640×480. As saídas são WebP e não carregam EXIF/metadata de localização.
- Por que comprova a ideia: cobre a conversão real no servidor e os dois usos previstos pelo cardápio, não só o nome dos arquivos.

### 4. Rejeições por conteúdo real de imagem

- Objetivo: rejeitar arquivo inválido, arquivo corrompido, menor lado inferior a 400 e arquivo maior que `15 * 1024 * 1024` bytes.
- Entrada: bytes de texto com extensão `.jpg`, buffer truncado, imagem 399×800 e buffer com `15 * 1024 * 1024 + 1` bytes; conferir também que a constante do cliente tem o mesmo valor.
- Resultado esperado: cada entrada falha antes do upload, com código/erro mapeável à mensagem amigável; nenhuma variante é devolvida.
- Por que comprova a ideia: valida bytes com `sharp`, em vez de confiar em extensão ou `Content-Type` do navegador.

### 5. Caminho de variante e compatibilidade legada

- Objetivo: escolher `-card.webp` e `-detail.webp` para a base nova sem quebrar arquivo legado com extensão.
- Entrada: `products/id/uuid` e `products/id/foto-antiga.jpg`.
- Resultado esperado: o primeiro vira os dois sufixos WebP; o segundo continua `foto-antiga.jpg` para ambas as solicitações.
- Por que comprova a ideia: mantém o cardápio disponível durante a migração de dados antigos.

### 6. Validação de vídeo no navegador

- Objetivo: aceitar apenas MP4/WebM de até 10 MB e 15 segundos lidos por metadata.
- Entrada: MP4 de 10 MB e 15 s; MIME `video/quicktime`; MP4 de 10 MB + 1 byte; WebM de 15,1 s; metadata com erro.
- Resultado esperado: somente o primeiro é aceito; os demais retornam mensagem clara correspondente.
- Por que comprova a ideia: bloqueia envio caro/incompatível ainda no celular, antes da URL assinada.

### 7. Parse de destino de destaque

- Objetivo: aceitar rota interna ou URL HTTP(S), normalizar vazio e rejeitar destino perigoso/inválido.
- Entrada: `/cardapio`, `/produto/uuid`, `https://exemplo.com/oferta`, vazio, `javascript:alert(1)`, `www.exemplo.com`, `//evil.com` e `/\evil.com`.
- Resultado esperado: as três primeiras são aceitas, vazio vira `null`, e os quatro últimos retornam erro de campo. Rota interna não pode ser protocol-relative nem conter barra invertida.
- Por que comprova a ideia: conserva a liberdade editorial sem transformar banner em vetor de URL insegura ou quebrada.

### 15. Qualidade visível por PSNR

- Objetivo: comprovar quantitativamente que a compressão mantém qualidade visual útil, não apenas dimensões e tamanho.
- Entrada: imagem natural/ruidosa 3200×1800; a original é rotacionada e reduzida pelo `sharp` ao mesmo tamanho de cada variante, gerando referência PNG sem perda.
- Resultado esperado: após decodificar WebP, PSNR é de pelo menos 35 dB para `detail` e pelo menos 33 dB para `card`.
- Por que comprova a ideia: mede a regra da nota 08 de comprimir sem perda visível, com limites distintos para detalhe e miniatura.

### 16. Metadados EXIF e GPS são removidos

- Objetivo: garantir que orientação e localização do aparelho não sejam publicadas no Storage.
- Entrada: JPEG com EXIF e GPS em IFD3 (`withExif`) e ICC.
- Resultado esperado: `await sharp(saída).metadata()` não tem `exif`; não há metadata de localização/ICC reaproveitada da entrada.
- Por que comprova a ideia: assegura privacidade e confirma que a conversão não preserva metadados do celular.

## Testes de integração com fakes de Supabase/Storage

### 8. Troca segura de foto de produto

- Objetivo: provar a ordem segura da substituição: subir variantes, atualizar registro, verificar referências e apagar a anterior por último.
- Entrada: produto com `image_path` antigo, imagem válida e fake que registra chamadas.
- Resultado esperado: `upload(detail)` e `upload(card)` ocorrem antes de `products.update`; `remove` do caminho antigo ocorre somente depois da atualização e de consultas de referência. O banco passa a guardar apenas a base nova.
- Por que comprova a ideia: implementa literalmente o protocolo de troca segura da nota 08 e evita produto sem foto em falha parcial.

### 9. Falha no meio da troca de foto

- Objetivo: assegurar que uma falha de upload ou de atualização não destrói a foto anterior.
- Entrada: cenários com falha no segundo upload e com falha em `products.update`.
- Resultado esperado: no primeiro, qualquer objeto novo já criado é removido; no segundo, as duas variantes novas são removidas; em ambos o registro permanece com o caminho antigo e não há remoção do caminho antigo.
- Por que comprova a ideia: testa a propriedade mais importante do fluxo: preservar o estado anterior em erro.

### 10. Referência compartilhada impede limpeza

- Objetivo: não remover uma imagem/vídeo ainda usado por outro registro.
- Entrada: produto/destaque atualizados ou removidos com outro produto, destaque ou categoria referenciando o mesmo `image_path`; e outro produto referenciando o mesmo `video_path`.
- Resultado esperado: o registro solicitado é atualizado/removido, mas `storage.remove` não recebe o caminho compartilhado.
- Por que comprova a ideia: evita arquivo quebrado em outra tela e confirma a checagem de referências antes da limpeza.

### 11. Remoção de foto com vídeo é recusada

- Objetivo: preservar a capa obrigatória de um produto que tem vídeo.
- Entrada: produto com `image_path` e `video_path` preenchidos.
- Resultado esperado: ação retorna erro amigável, não altera o banco e não remove objeto algum.
- Por que comprova a ideia: respeita o `check` de banco e a experiência pública, onde a foto é poster/fallback.

### 12. Assinatura, confirmação e troca segura de vídeo

- Objetivo: validar que o upload direto só é confirmado após a existência do objeto e que o vídeo anterior é removido por último.
- Entrada: produto com foto, MP4 válido e Storage fake que retorna URL/token; depois cenário em que `list` não encontra o objeto.
- Resultado esperado: a criação retorna caminho `products/<productId>/<uuid>.mp4`; a confirmação inexistente falha sem atualizar `video_path`; a confirmação existente atualiza o banco e só então remove o antigo se não houver referência.
- Por que comprova a ideia: separa autorização de upload da publicação do vídeo e evita apontar o cardápio para arquivo ausente.

### 13. CRUD, ordem e auditoria de destaques

- Objetivo: validar criação, edição, ativação, troca de posição e exclusão com `audit_logs`.
- Entrada: lista de três destaques ordenados, formulários válidos e uma exclusão confirmada.
- Resultado esperado: criação usa última ordem + 1; subir/descer troca apenas os dois `sort_order` previstos; cada mutação registra entidade `highlight` e ação adequada; exclusão limpa imagem não referenciada somente após excluir o registro.
- Por que comprova a ideia: garante gestão editorial rastreável e ordem estável no banner público.

### 14. Autorização antes de qualquer mutação de mídia

- Objetivo: garantir que ações de foto, vídeo e destaque não tocam Storage nem banco sem `requireAdmin`.
- Entrada: `requireAdmin` retornando `null` para cada Server Action.
- Resultado esperado: erro de sessão amigável e zero chamadas a upload, URL assinada, update, delete ou audit.
- Por que comprova a ideia: a interface não é a barreira de segurança; as ações protegidas e o RLS precisam ser a defesa real.

## Validação posterior no navegador e banco

Depois de o Claude Code aprovar este plano e os testes automatizados forem escritos/executados, validar manualmente em 375 px e em um aparelho real: câmera/galeria, orientação EXIF, barra de progresso, área segura da barra Salvar, foco/teclado, confirmação de remoção e fallback de foto/vídeo. No Supabase de homologação, conferir as policies de `storage.objects`, limites/mimes dos buckets, URL assinada de vídeo, acesso anônimo público somente para leitura e ausência de objetos antigos após troca bem-sucedida.

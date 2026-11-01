# Proposta — mídia em categorias e destaques

Data: 2026-10-13. Documento de planejamento; nenhuma implementação foi feita.

## 1. Diagnóstico por item: existe x falta de verdade

### Pipeline de imagem

- Já existe redução no navegador para no máximo 2048 px no maior lado, sem ampliar, entrada de até 15 MiB e saída JPEG qualidade 0,92 (`lib/media/client-resize.ts`).
- No servidor, `sharp` valida o conteúdo real (JPEG, PNG, WebP ou HEIF), exige pelo menos 400 px no menor lado e até 15 MiB, remove metadados/rotação e gera WebP `detail` (até 1600 px; meta 300 KiB) e `card` (até 640 px; meta 80 KiB), com qualidade 82→76→70, `effort: 5` e `smartSubsample` (`lib/media/compress.ts`). As metas não são tetos: se qualidade 70 ainda exceder a meta, o arquivo é mantido; o bucket impõe 1 MiB por objeto (`supabase/migrations/20261009121148_media_storage.sql`).
- Troca segura já faz upload novo, atualiza o registro, reverte o novo em falha e só depois tenta limpar o anterior (`lib/media/workflow.ts`, `app/admin/(painel)/midia/actions.ts`). URLs aceitam `product-images` e `highlight-images` (`lib/media.ts`).
- Falta tornar a rotina genérica para categoria: hoje tipos, auditoria, exclusão de referência e ações aceitam somente produto/destaque (`app/admin/(painel)/midia/actions.ts`).

### Categorias

- `categories.image_path` já existe (`supabase/migrations/20261008222757_initial_schema.sql`) e é lido nos tipos/consultas (`lib/admin/catalog.ts`, `lib/menu/get-public-menu.ts`, `lib/menu/types.ts`).
- A home já usa a variante `card` de `product-images` no círculo de 52 px, com emoji se não houver imagem (`app/(public)/(listas)/page.tsx`).
- O painel não mostra prévia, seletor, troca ou remoção; as ações de categoria não manipulam Storage (`components/admin/category-manager.tsx`, `app/admin/(painel)/categorias/actions.ts`). Ao excluir uma categoria sem produtos, sua imagem também não seria limpa hoje.
- Chips do cardápio e atalhos da busca são somente texto (`components/menu/category-nav.tsx`, `components/menu/search-results.tsx`).

### Destaques e vídeo

- Destaque já possui `image_path`, upload/remoção de foto e bucket público `highlight-images` (`components/admin/highlights-manager.tsx`, `app/admin/(painel)/midia/actions.ts`, `supabase/migrations/20261009121148_media_storage.sql`). Não existe `video_path` em banco, tipos, consultas, painel ou banner.
- O banner tem 240 px, troca a cada 6 s, mostra a imagem `detail` em `object-contain` numa caixa à direita de 54% × 228 px e usa arte da casa sem foto (`components/menu/highlight-banner.tsx`, `lib/menu/highlight-carousel.ts`). A primeira imagem é `eager/high`; as demais recebem `loading="lazy"` (`components/menu/media-image.tsx`).
- Vídeo de produto aceita MP4/MOV/WebM, bruto até 50 MiB e 15 s (tolerância 15,5 s), dimensões de entrada até 4096 por lado e 8.847.360 pixels. Gera MP4 H.264, até 1280×720 ou 720×1280, até 30 fps, sem áudio/metadados, BT.709, `faststart`, CRF 24/maxrate 1500k; fallback CRF 28/maxrate 1000k; teto efetivo 4 MiB (`lib/media/video/constants.ts`, `arguments.ts`, `compress.ts`). Usa `ffmpeg-static` 5.3.0 (`package.json`, `lib/media/video/process.ts`).
- A rota Node tem `maxDuration = 180`, orçamento interno 170 s e processamento de 150 s; bruto privado em `product-video-uploads`, publicado em `product-videos`, com cache de um ano (`app/admin/(painel)/midia/video/route.ts`). O cliente faz upload assinado com progresso (`lib/admin/product-media-client.ts`).
- Reutilizável sem mudança conceitual: detecção de assinatura, leitura/validação de metadados, HDR→SDR, execução segura do ffmpeg, validação H.264/sem áudio/faststart, temporários e `commitStagedMedia` (`lib/media/video/*`, `lib/media/workflow.ts`).
- Acoplado a produto: perfil fixo 720p/15 s/bitrates; `productId`, tabela/coluna/capa; regex e pastas; nomes dos buckets; auditoria; revalidação; limpeza tipada apenas para `products`; cliente e endpoint (`arguments.ts`, `storage-cleanup.ts`, `actions.ts`, `route.ts`, `product-media-client.ts`).

## 2. Imagem nas categorias

- Fluxo: na folha de criar/editar categoria, seção “Foto da categoria” com prévia circular, “Escolher/trocar” e “Remover”. No cadastro novo, salvar primeiro, receber o `id` e então enviar a foto; se a mídia falhar, manter a categoria criada e a folha aberta com opção de tentar novamente.
- Reaproveitar `resizeImageForUpload` e `compressImageToWebp`. Guardar em `product-images`, pasta `categories/{categoryId}/{uuid}`, base no `image_path`; usar `card` na home. Gerar também `detail` por compatibilidade com o pipeline atual, embora não haja consumidor agora. Otimização futura possível: perfil de categoria somente `card`, após medir se vale a complexidade.
- Generalizar upload/limpeza para entidade `category`; ao trocar, manter a antiga até o vínculo novo confirmar. Ao remover ou excluir, zerar/excluir o registro primeiro e apagar as duas variantes somente após consultar referências em `products`, `highlights` e `categories`. Falha de limpeza gera observabilidade, sem desfazer a alteração válida.
- Exibição recomendada: somente círculos da home. Manter chips do cardápio e atalhos da busca textuais, pois são compactos e já têm boa leitura (`category-nav.tsx`, `search-results.tsx`).
- Migration: não. A coluna e o bucket/policies já existem; só há código e testes a alterar (`20261008222757_initial_schema.sql`, `20261009121148_media_storage.sql`).
- Auditoria: `media_image_replace` e `media_image_remove` com `entity: category`, bucket, caminho novo e, sem expor conteúdo, resultado da limpeza; exclusão da categoria deve registrar a limpeza tentada.
- Testes: unidades para seleção de variantes/referências; ações com upload parcial, rollback, troca, remoção e exclusão; UI de criar/editar/repetir; home com imagem, sem imagem e URL quebrada; JPEG/PNG/WebP, limites 400 px e 15 MiB; RLS de escrita só para admin.
- Esforço: **P** (pode virar M se a criação + upload na mesma folha exigir refatoração do estado compartilhado).

## 3. Imagem OU vídeo nos destaques

### Dados, Storage e pipeline

- Adicionar `highlights.video_path text null` e check `video_path is null or image_path is not null`. Não adicionar `media_type`: `video_path` preenchido significa vídeo; nulo significa foto/arte. “Foto ou vídeo” é a apresentação; a imagem continua armazenada como capa obrigatória e fallback do vídeo.
- Migration necessária para coluna/check. Atualizar `AdminHighlight`, `MenuHighlight`, consultas pública/admin e exclusão. Recomendo reutilizar `product-video-uploads` e `product-videos`, com prefixos próprios `uploads/highlights_{id}_{uuid}` e `highlights/{id}/{uuid}.mp4`; as policies atuais já cobrem os buckets. Testar RLS. Vantagem: sem buckets/policies duplicados; custo: nomes legados “product”.
- Ao compartilhar bucket publicado, a remoção deve consultar `products.video_path` e `highlights.video_path` antes de apagar. Generalizar faxina de órfãos para entidade/prefixo; hoje ela lista `uploads` e consulta somente `products` (`lib/media/video/storage-cleanup.ts`).
- Criar perfis no compressor. Preservar o perfil de produto sem regressão e adicionar perfil **proposto** para o banner atual: duração máxima 6 s (tolerância 6,5), caixa máxima 640×640 sem ampliar, até 30 fps, H.264 sem áudio/faststart, CRF 25 e maxrate 900k; fallback CRF 28 e maxrate 650k; alvo 1 MiB e teto 1,5 MiB. Como a área tem só 228–240 CSS px, 720p é desperdício no desenho atual. Se o banner virar foto/vídeo de fundo inteiro, reavaliar para 960×540 após o teste visual.
- Manter bruto em até 50 MiB por simplicidade/compatibilidade; monitorar duração de função, memória e saída real no stage. Os números do perfil de banner são proposta a validar, não valores existentes.

### Painel e comportamento público

- Na folha: escolha única “Foto” ou “Vídeo”. Foto mantém o fluxo atual. Vídeo exige capa já salva, mostra seleção, validação, envio percentual, “compactando”, sucesso com redução de tamanho e falha recuperável; nunca remover mídia anterior antes do novo vínculo. Ao trocar para foto, confirmar remoção do vídeo; ao trocar vídeo, preservar capa.
- Generalizar o cliente/endpoint para `{entityType, entityId, path, profile}` com lista fechada no servidor; não aceitar perfil arbitrário do navegador. Incluir auditoria `media_video_replace/remove` para `highlight` com bytes, duração, dimensões e fallback usado.
- Público: poster aparece primeiro e continua candidato de LCP; `<video muted playsInline loop preload="none">`, sem controles por ser decorativo, `aria-hidden`, somente no slide ativo. O `src` só é atribuído ao ativo; ao sair, pausar e remover/carregar nenhum outro vídeo.
- Autoplay recomendado somente no slide ativo. Pausar fora da tela, em aba oculta, durante interação e quando o carrossel estiver pausado. Com `prefers-reduced-motion`, mostrar só a capa; com `navigator.connection.saveData`, mostrar capa e botão opcional “Reproduzir vídeo”.
- O carrossel continua avançando em 6 s e não espera além do vídeo; vídeo de até 6 s reinicia/entra em loop apenas enquanto ativo. Limitar a **2 destaques ativos com vídeo** no servidor e sinalizar o limite no painel.
- Acessibilidade: título/descrição/link continuam a informação; vídeo é decoração. Adicionar controle visível “Pausar/continuar destaques”, manter navegação manual, foco e anúncio. Garantir contraste sobre poster/quadro e não depender do movimento para comunicar oferta.
- Impacto: `preload="none"`, poster prioritário, `src` só ativo, teto 1,5 MiB e máximo de dois reduzem LCP, tráfego e bateria. Ainda há risco de pico de CPU/timeout na Vercel Hobby e de banda/storage no Supabase Free; medir compressão p50/p95, falhas, bytes servidos e reproduções no stage. Não processar vídeos em paralelo na mesma sessão.
- Regras do vault a revisar após aprovação: `04-Experiencia-do-Cliente.md` (vídeo deixa de ser exclusivo do detalhe, mas segue sem bloquear a home), `08-Imagens-e-Storage.md` (perfil/buckets/limites de destaque) e `03-Decisoes-do-Projeto.md` (nova decisão, limites e revisão). Também corrigir a decisão do carrossel que menciona botão de pausa ainda inexistente no código.
- Testes: unidades dos dois perfis, argumentos ffmpeg, constraints e limpeza cruzada; integração MP4/MOV/WebM, HDR, rotação, 6/6,5 s, 1/1,5 MiB, timeout e rollback; RLS; painel em queda/reenvio; público ativo/inativo, `saveData`, movimento reduzido, aba oculta/offscreen, autoplay bloqueado, link/foco/pausa; Lighthouse e rede móvel; regressão completa do vídeo de produto.
- Esforço: **G** no conjunto (dados/storage M, generalização do pipeline M, painel M, reprodução/acessibilidade/performance M/G). Risco principal: compactação síncrona próxima do limite de 180 s e custo de servir vídeo na primeira tela.

## 4. Roteiro de teste das imagens nos destaques na retomada

- Usar material autorizado: alimento 16:9 deitado, 9:16 em pé, quadrado, fundo claro/escuro, muito detalhe, assunto nas bordas e no centro, arquivo próximo de 15 MiB, imagem perto do mínimo de 400 px e PNG com transparência. Este último testa a perda de alfa causada pelo JPEG do cliente (`client-resize.ts`), não preservação de transparência.
- Montar pelo menos 4 destaques no **stage**, incluindo títulos curtos/longos e descrições; testar 360, 390 e desktop, DPR 1/2, rede móvel simulada e URL quebrada.
- Medir dimensões/bytes das variantes, requisições no waterfall, qual imagem é eager/lazy de fato, LCP, CLS, tempo até conteúdo legível, contraste, corte, estabilidade na troca de 6 s e consumo total após percorrer todos os slides. Guardar baseline sem fotos.
- Aprovar se: não houver salto/overflow/piscar; texto, CTA e indicadores permanecerem legíveis; fallback funcionar; só a primeira mídia for crítica; variante `detail` ficar na meta de ~300 KiB ou a exceção em qualidade 70 for registrada; LCP móvel de stage ficar ≤2,5 s e não regredir mais de 200 ms contra o baseline (metas propostas); nenhuma foto exceder o limite de 1 MiB do bucket.
- Metade direita (atual): preserva texto/contraste, aceita fotos variadas e exige menos redesign; perde impacto e deixa o produto menor. Banner inteiro: mais impacto de vitrine, mas exige `object-cover`, área segura, scrim/contraste e fotos próprias para corte; aumenta risco de texto sobre assunto. **Recomendação:** validar e lançar primeiro a metade direita; tratar fundo inteiro como mudança visual separada, somente se o responsável preferir após ver o stage.

## 5. Ordem recomendada em pacotes pequenos

1. **PR 1 — baseline e testes de fotos de destaque (P):** roteiro automatizado/manual, medições e decisão metade x inteiro. `develop` → stage; sem produção até aprovação visual.
2. **PR 2 — imagem de categoria (P):** ações genéricas, folha, auditoria, limpeza e testes. `develop` → stage → produção após aceite; independe de vídeo.
3. **PR 3 — fundação do vídeo de destaque (M):** migration, tipos, perfis genéricos, storage/limpeza e regressão de produto. Depende do PR 1 para fixar resolução. `develop` → migration no stage → testes; não produção.
4. **PR 4 — painel de destaque (M):** escolha foto/vídeo, capa, progresso, falhas, limite de dois e auditoria. Depende do PR 3. `develop` → stage com vídeos reais de iPhone/Android.
5. **PR 5 — banner público e acessibilidade (M/G):** carregamento só ativo, poster, economia de dados/movimento reduzido, pausa visível, telemetria e testes de desempenho. Depende dos PRs 3–4. `develop` → stage; produção somente após revisão das regras do vault e aceite explícito.

## 6. Onde discordo do Claude/rascunho

- Não recomendo reaproveitar “720p, 15 s, até 4 MB” sem mudança para destaque: é excessivo para 240 px e conflita com a rotação de 6 s. Reutilizar o motor, mas criar perfil menor.
- O alvo “até 3 MB” não é hoje regra de produção: `VIDEO_TARGET_BYTES` aparece em constante/teste, mas `compressVideoFile` usa por padrão `VIDEO_OUTPUT_MAX_BYTES` de 4 MiB (`constants.ts`, `compress.ts`, `video.integration.test.ts`).
- “As outras fotos só carregam quando chegam perto” não está comprovado: o código apenas marca `loading="lazy"`; carrossel horizontal e navegador podem antecipar. Confirmar no waterfall.
- O vault diz que existe botão de pausar, mas `highlight-banner.tsx` não o renderiza; há pausas por foco, ponteiro, movimento reduzido, aba oculta e fora da tela (`highlight-carousel.ts`). O botão deve entrar antes do vídeo.
- PNG transparente não permanece transparente porque todo arquivo passa por canvas e vira JPEG no cliente (`client-resize.ts`). Testá-lo é útil para decidir o fundo resultante.
- A afirmação “stage e produção não têm foto” não é verificável pelo repositório; fica como **hipótese informada pelo responsável/rascunho**, a confirmar nos ambientes.

## 7. Perguntas para o responsável

1. A foto deve continuar na metade direita ou ocupar o banner inteiro? **Recomendo metade direita primeiro**, depois decidir vendo o stage.
2. O vídeo pode tocar sozinho, sem som, quando aparece? **Recomendo sim**, apenas no destaque visível; economia de dados ou menos animação mostram a capa.
3. O carrossel troca sempre em 6 segundos ou espera o vídeo? **Recomendo manter 6 segundos** e limitar o vídeo a 6 segundos.
4. Podemos limitar a dois destaques com vídeo ligados ao mesmo tempo? **Recomendo sim** para proteger internet, bateria e cota.
5. Todo vídeo deve ter uma foto de capa? **Recomendo sim** para abrir rápido e continuar bonito se o vídeo falhar.

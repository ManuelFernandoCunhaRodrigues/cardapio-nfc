# Épico 4 — Plano de testes do Claude Code (para validação do Codex)

Protocolo: [testes cruzados](../../Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/11-Agentes-de-IA.md). Estes testes são executados pelo Claude Code no **SALGAE-STAGING** e no navegador (app local apontando para o staging). O Codex valida a ideia de cada teste antes da execução.

Fixtures geradas fora do repositório (scratchpad): foto JPEG grande com ruído (4000×3000), foto PNG, foto com EXIF de rotação (orientação 6) e GPS, imagem pequena (300×300), arquivo de texto renomeado para `.jpg`, imagem acima de 15 MB, vídeo MP4 de 8 s (< 10 MB), vídeo MP4 de 20 s, vídeo acima de 10 MB.

## Banco e Storage (SQL simulando papéis)

| # | Objetivo | Passos | Esperado | Por que comprova a ideia |
| --- | --- | --- | --- | --- |
| B1 | Buckets com limites certos | Ler `storage.buckets` | `product-images`/`highlight-images`: públicos, 1 MB, só `image/webp`; `product-videos`: público, 10 MB, `video/mp4` e `video/webm` | Storage só aceita o formato final e tamanhos previstos (nota 08) |
| B2 | Visitante não grava | Como `anon`, `insert` em `storage.objects` de cada bucket | Bloqueado por RLS | Só a equipe envia mídia (nota 12) |
| B3 | Usuário comum não grava | Como `authenticated` sem perfil admin | Bloqueado | Permissão no banco, não só na tela |
| B4 | Admin grava | Como admin: `insert` de objeto de teste (rollback). A exclusão direta por SQL é bloqueada pelo próprio Supabase (`storage.protect_delete`), então apagar é verificado pela API do Storage em N6/N9 | Inserção permitida | Fluxo do painel funciona com RLS |
| B5 | Leitura pública sem listagem | URL pública responde 200 para anônimo **e** `select` em `storage.objects` como `anon` retorna 0 | URL ok, listagem bloqueada | Cardápio exibe mídia sem login e ninguém enumera os arquivos (ajuste validado pelo Codex) |
| B6 | Sem órfãos após troca | Após trocar foto e vídeo no navegador (N6/N7) de um produto exclusivo de teste, listar `products/<id>/` | Só os arquivos atuais existem (escopo: o fluxo testado, não órfãos históricos) | "Alterar ou remover não deixa arquivo órfão" (Épico 4) |

## Navegador — painel no celular (375×812, admin logado)

| # | Objetivo | Passos | Esperado |
| --- | --- | --- | --- |
| N1 | Cadastro pelo celular | Novo produto: nome, preço `8,90` (teclado decimal), categoria e badge por chips, foto JPEG 4000×3000 | Barra Salvar fixa visível; prévia da foto antes de salvar; progresso; sucesso com link "Ver no cardápio" |
| N2 | Compressão WebP | Após N1, baixar as variantes | `detail` ≤ 1600 px e `card` ≤ 640 px no maior lado, ambas `image/webp`, proporção preservada, **sem EXIF/GPS**; registrar o tamanho real — as metas (300/80 KB) são objetivo, não falha, se a qualidade 70 exigir mais |
| N3 | Qualidade visível | Comparar visualmente card e detalhe do produto no cardápio (375 px, DPR 3) com a original | Sem borrão/blocos perceptíveis; nitidez adequada no card de 156 px e no detalhe de 260 px |
| N4 | Rotação EXIF | Enviar foto com orientação 6 | Aparece em pé no painel e no cardápio |
| N5 | Rejeições | Enviar texto renomeado `.jpg`, imagem 300×300, imagem > 15 MB | Mensagens claras; nada salvo no Storage nem no banco |
| N6 | Troca segura de foto | Trocar a foto do produto de N1 | Cardápio mostra a nova; antigas apagadas (B6) |
| N7 | Vídeo válido | Enviar MP4 de 8 s | Barra de progresso; `video_path` salvo; no cardápio, detalhe mostra capa com play; vídeo só baixa após tocar no play (aba de rede) |
| N8 | Vídeo inválido | MP4 de 20 s e > 10 MB | Rejeitado no cliente com mensagem clara; nada enviado |
| N9 | Remover vídeo e foto | Remover vídeo, depois foto (com confirmação) | Registro limpo, objetos apagados; produto sem foto mostra fallback; banco impede vídeo sem foto |
| N10 | Destaques | Criar destaque com imagem e destino `/cardapio#combos`, reordenar, desativar | Banner da home mostra a imagem e segue a ordem; desativado some do cardápio |
| N11 | Usabilidade mobile | Navegar painel (listas, formulários, modais) a 375 px | Sem rolagem horizontal; alvos ≥ 44 px; ações principais na zona do polegar; modal com Esc/foco |
| N12 | Auditoria | Após N1–N10 e exclusão confirmada de um produto e de um destaque de teste | `audit_logs` com `actor_id`, `entity`, `entity_id` e ação correta para cada mutação executada (create/update/delete/reorder) |

## Regressão

| # | Objetivo | Esperado |
| --- | --- | --- |
| R1 | lint, typecheck, testes, build | Tudo verde |
| R2 | Cardápio público (/, /cardapio, /produto, /busca, /info) | Igual ao Épico 2, agora com fotos/vídeos reais |
| R3 | Produto sem foto antigo | Continua com fallback, sem erro |

Ao final, os dois conferem se os resultados batem com as notas 04, 05, 08 e 14 do vault; divergências são corrigidas e os testes afetados repetidos.

## Resultados (Claude Code)

| # | Resultado |
|---|---|
| R1 | ✅ lint, typecheck, 54 testes (14 arquivos) e build. Pré-condição acrescentada ao teste 16 do Codex (a entrada precisa ter EXIF, orientação 6 e ICC, senão o teste passaria sem provar nada). |
| B1 | ✅ `product-images` e `highlight-images`: públicos, 1.048.576 bytes, `image/webp`; `product-videos`: público, 10.485.760 bytes, `video/mp4`/`video/webm`. |
| B2 | ✅ `anon` bloqueado (42501) nos três buckets. |
| B3 | ✅ usuário comum bloqueado para inserir (42501) e não lista objetos (0). |
| B4 | ✅ admin insere e enxerga o objeto (1). |
| B5 | ✅ (listagem) `anon` lista 0 objetos. URL pública 200 verificada em N1. |
| Advisor | ✅ sem alertas novos (só proteção de senha vazada do Auth, configuração do painel). |
| B6 | ✅ troca de foto apagou as variantes antigas (URL antiga → 400); após remover vídeo e foto, 0 objetos do produto; Storage vazio após excluir produto e destaque de teste. |
| N1 | ✅ fluxo funciona (prévia, progresso, "Produto criado… Ver no cardápio"). ❌ **Barra Salvar coberta pelas abas do painel no celular** (z-index 30 vs 40, mesma posição): tocar em Salvar aciona a aba "Categorias". ⚠️ Após criar, a tela continua em "Novo produto" (risco de duplicar; vídeo só disponível após reabrir). |
| N2 | ✅ detail 1600×1200 (245 KB) e card 640×480 (16 KB) a partir de JPEG 4000×3000 de 6,4 MB; WebP; sem EXIF/ICC. PSNR do arquivo real vs original = 30,2 dB numa fixture de ruído gaussiano pesado (pior caso; inclui a etapa JPEG do navegador) — qualidade avaliada visualmente em N3. |
| N3 | ✅ detalhe usa `detail` (srcset 640w/1600w, `sizes=100vw`); card usa `card` com `loading=lazy`; imagem nítida a 375 px. |
| N4 | ✅ JPEG 3000×2000 com orientação 6 → detail 1066×1600 (em pé), sem EXIF/GPS. |
| N5 | ✅ texto `.jpg`, 300 px e PNG 50 MB rejeitados com mensagem clara; banco e Storage inalterados. ⚠️ Após rejeitar a imagem pequena a barra ainda exibe "100%". |
| N6 | ✅ troca segura (ver B6). |
| N7 | ✅ upload com progresso real (validando → enviando 10–90% → confirmando → salvo); no cardápio, 0 requisições de vídeo antes do play, `preload=none`, `muted`, `playsInline`, poster. ❌ **Tocar no play mostra o vídeo parado** (`readyState 0`), exige segundo toque. |
| N8 | ✅ 20 s e 14,6 MB rejeitados no cliente; 0 requisições ao Storage. |
| N9 | ✅ remover foto com vídeo é recusado; remover vídeo e depois foto funcionam e apagam objetos. ❌ **Usa `window.confirm` do navegador** em vez do modal de confirmação do painel (padrão do vault). |
| N10 | ✅ criar com imagem PNG→WebP, reordenar (vai ao topo do banner com a imagem), desativar. |
| N11 | ✅ sem rolagem horizontal em /admin, produtos, categorias, destaques e home a 375 px; chips; teclado decimal; Esc fecha o modal. ❌ barra Salvar (ver N1). ⚠️ **Modal não move o foco para dentro ao abrir** (foco fica no body). |
| N12 | ✅ audit_logs com actor_id e entity_id para create/update/reorder/delete e media_* de produto e destaque. |
| R2/R3 | ✅ rotas públicas sem erro; produtos sem foto usam fallback. Erro de hidratação no menu do painel investigado: era cache antigo do servidor de dev (HTML do servidor e do navegador idênticos após limpar `.next`). |

## Reteste após correções (rodada 1)

Plano de correções do Codex (C1–C7) validado pelo Claude; reteste do Claude validado pelo Codex. Cliques reais por coordenada a 375×812.

| # | Resultado |
|---|---|
| Regressão | ✅ lint, typecheck, 54 testes, build |
| R-N1 / C1 | ✅ toque real em "Criar produto" salva; centro do botão = o próprio botão (produto e destaque) |
| C2 | ✅ redireciona para `/admin/produtos/[id]?criado=1` com "Ver no cardápio" e campo de vídeo |
| R-N7 / C3 | ✅ um toque no play: `currentTime` 2,85 s, `paused=false`; 0 `.mp4` antes do toque |
| R-A11y / C5 | ⚠️ foco inicial em Cancelar, Tab/Shift+Tab presos, Esc fecha, `window.confirm` nunca chamado; ❌ foco não volta ao gatilho |
| R-N9 / C4 | ❌ **regressão**: modal de remover foto/vídeo tem `<form>` aninhado no form do produto; "Excluir de vez" não faz nada (toque real) |
| R-N5 / C6 | ✅ erro sem "100%" |
| R-44 / C7 | ✅ nenhum alvo < 44 px em editar produto e destaques |

Correções A (form aninhado) e B (foco de retorno) enviadas ao Codex; reteste R-N9b, R-A11y-b e R-forms em seguida.

## Reteste após correções (rodada 2)

Plano C8–C10 do Codex validado pelo Claude; reteste R-N9b, R-A11y-b e R-forms validado pelo Codex. Cliques reais por coordenada a 375×812.

| # | Resultado |
|---|---|
| Regressão | ✅ lint, typecheck, 54 testes, build |
| R-forms / C8 | ✅ `form form` = 0 em /admin/produtos/novo, /admin/produtos/[id] (com modal aberto, que fica no `body`) e /admin/destaques (com edição aberta) |
| R-N9b / C9 | ✅ Cancelar não remove; "Excluir de vez" remove vídeo ("Vídeo removido.") e depois foto ("Foto removida."); banco `image_path`/`video_path` nulos e 0 objetos no Storage |
| R-A11y-b / C10 | ✅ foco volta a "Remover vídeo" após Cancelar e após Esc |

**Conclusão:** todos os testes (Codex 1–16 e C1–C10; Claude B1–B6, N1–N12, R1–R3 e retestes) batem com as notas 04, 05, 08 e 14 do vault. Dados de teste removidos do staging (Storage dos buckets de mídia vazio).

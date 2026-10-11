# Compactação de vídeo — validação do Claude Code

Duas partes: (1) o que foi feito com cada ponto da revisão do Codex sobre a arquitetura ([validação do Codex](video-compactacao-validacao-codex.md)); (2) validação do plano de testes do Codex ([plano do Codex](video-compactacao-plano-codex.md)). Onde houve divergência, ficou a opção escolhida e o motivo.

Rodada 1 do Codex: `gpt-5.6-terra`, esforço `medium` (revisão + plano de testes; tarefa de complexidade média).

## 1. Revisão de arquitetura do Codex — resolução

O Codex **manteve a arquitetura** (ffmpeg no servidor, síncrono) e pediu ajustes. Resultado:

| Ponto do Codex | Resolução | Motivo |
| --- | --- | --- |
| Limites de recurso de entrada (REPROVADO) | **Aceito** | Entraram: tempo máximo na leitura e na codificação, teto de pixels/lado, só o primeiro fluxo de vídeo, rejeição de arquivo sem vídeo. Plano §3.2. |
| CRF + `maxrate` não garante tamanho (REPROVADO) | **Aceito com ajuste** | O VBV limita o total a `maxrate × duração + bufsize`; reduzi o `bufsize` para 2250k (teto ≈ 3,0 MiB em 15 s) e entrou a rede de segurança pedida: se passar de 4 MiB, uma recodificação mais apertada; se ainda passar, erro com o vídeo anterior mantido. O caminho é testado com o teto injetado (não dá para forçá-lo com vídeo real, justamente porque o VBV segura). |
| Concorrência no mesmo produto (REPROVADO) e faxina de 30 min (REPROVADO) — proposta: tabela de *upload intent* com estado, lease e heartbeat | **Divergência — não adotada a tabela; riscos tratados de outro jeito** | A tabela resolve um problema que este fluxo não tem: (a) o objeto bruto só existe no Storage quando o envio termina, então a faxina não tem como apagar um envio "ainda carregando"; (b) depois que o objeto existe, a função vive no máximo 180 s — um objeto com 30 min nunca está em processamento; (c) dois envios para o mesmo produto terminam em "o último a gravar vence", e o perdedor vira um arquivo órfão que a faxina recolhe — nunca um produto apontando para arquivo apagado, porque a faxina relê o `video_path` na hora de apagar e nunca apaga arquivo com menos de 30 min. Uma tabela nova com RLS, lease e heartbeat para um painel com uma ou duas pessoas enviando alguns vídeos por mês é mais superfície de erro do que o risco que cobre. O teste A6/A7 do Codex foi mantido, adaptado a essas regras. |
| CSRF do Route Handler (REPROVADO) | **Aceito** | `Origin` obrigatório e igual ao host da requisição, `Sec-Fetch-Site` conferido quando presente, sem CORS, resposta 403 antes de qualquer trabalho. Comparar com o host da própria requisição (e não com uma URL fixa) é o que funciona também nos previews. |
| Publicação exclusiva pela rota (AJUSTAR) | **Exceção aceita e registrada** | Sem `service_role` (regra do projeto), um admin com a própria sessão ainda consegue gravar um MP4 direto no bucket pela API. A garantia passa a ser dupla e honesta: o **painel** sempre compacta; o **bucket** nunca aceita mais que 4 MiB nem outro tipo que `video/mp4`. Admin é papel de confiança. |
| Rota de diagnóstico no preview (V2 REPROVADO) | **Divergência parcial** | O Codex pede usar a rota real autenticada. Não há como: o Claude Code não digita senha nem cria conta, e a sessão de admin do stage não existe no host do preview. Ficou a rota temporária, mas **fechada**: só responde em `VERCEL_ENV=preview` e exige um token aleatório cujo hash SHA-256 está no código (o token nunca entra no repositório); não lê nem grava dados; é removida num commit seguinte e não chega à `develop` (merge por squash). O que ela não prova (baixar/enviar ao Storage a partir da Vercel com sessão real) fica declarado como não testado. |
| Rotação: `-noautorotate` + filtro manual (AJUSTAR) | **Divergência — mantido o autorotate do ffmpeg** | É um caminho único (não há filtro manual de rotação para duplicar), cobre 90/180/270 e espelhamento, e zera a matriz na saída. O risco apontado é coberto por teste com padrão assimétrico (pixels, não só largura×altura) e conferência de que a saída não tem matriz de rotação. |
| Assinatura: lista de marcas `ftyp` permitidas (AJUSTAR) | **Parcial** | Entrou `DocType=webm` no EBML, `-protocol_whitelist file`, `-nostdin`, argumentos em array. **Não** entrou lista de marcas ISO: celulares usam dezenas (`isom`, `mp42`, `qt  `, `3gp5`, `M4V `…) e uma lista recusaria vídeo legítimo sem ganho, já que o demuxer é forçado e o ffmpeg precisa decodificar de verdade. |
| Duração por `max(end_pts)` com ffprobe (AJUSTAR) | **Ajuste equivalente, sem ffprobe** | O `ffmpeg-static` não traz `ffprobe`, e um segundo binário de ~60 MB só para isso não se paga. Regra: se a leitura informa duração > 15,5 s, recusa antes de codificar; a codificação é sempre limitada (`-t 16`); a duração **da saída** (medida, não declarada) é a autoridade — > 15,5 s recusa. Cobre WebM sem duração no cabeçalho. A saída preserva a duração da entrada (até 15,5 s), sem cortar. |
| FPS/VFR e GOP (AJUSTAR) | **Aceito** | Política explícita: no máximo 30 fps, tempos originais preservados, keyframe por tempo. Teste por contagem de quadros e duração. |
| HDR (AJUSTAR) | **Aceito, mais rígido** | Detecta `arib-std-b67`/`smpte2084`; o teste **falha** (não pula) se o binário Linux não tiver `zscale`/`tonemap`. |
| `faststart` por parser de caixas (AJUSTAR) | **Aceito** | `moov` antes de `mdat`, sem exigir ordem imediata. |
| Temporários e processo (AJUSTAR) | **Aceito** | `mkdtemp`, `finally`, mata o processo no estouro e espera sair; nada de caminho, argumento ou URL assinada em log. |
| Matriz de falha por etapa (AJUSTAR) | **Aceito** | Tabela no documento de resultados. Limitação declarada: uma saída órfã de um produto que nunca mais recebe vídeo só sai na remoção do vídeo ou do produto. |
| Limites Supabase em bytes (AJUSTAR) | **Aceito** | 52.428.800 e 4.194.304, conferidos no navegador, na action, na rota e no bucket. |
| Empacotamento e limites da Vercel (AJUSTAR) | **Aceito** | `runtime = 'nodejs'`, `maxDuration` literal, prova no preview com `ffmpeg -version` executado na função. |
| Demais pontos APROVADOS | — | Sem mudança. |

Ajustes do Codex ao **meu** plano de testes: aceitos E1–E11 (limiares separados, todos os fluxos, parser de caixas, WebM 1080p, contagem de quadros, HDR com tags, orçamento de tempo que reprova, casos extras de rejeição), B2/B4/B5 (pedido HTTP real ao Storage, caminho existente), V1/V4, R1/R3/R4. Em N3, a prova de `faststart` fica no E3; o navegador só prova "nada baixa antes do toque" e "toca". N4 em iPhone real e N5 com corrida real ficam fora do alcance desta sessão (ver "não testado" nos resultados); a corrida é coberta por teste automatizado (A6).

## 2. Validação do plano de testes do Codex

| # | Parecer | Ajuste |
| --- | --- | --- |
| Premissas | AJUSTAR | Não haverá `ffprobe` nem dependência nova além de `ffmpeg-static`: a leitura é feita pelo próprio `ffmpeg -i` e a saída é conferida pelo parser de caixas + nova leitura. Manter "sem `skip`". |
| U1, U2 | APROVADO | Conferir também `-protocol_whitelist file` posicionado **antes** do `-i` (é opção de entrada) e `-t` de proteção. |
| U3 | APROVADO | Sem lista de marcas ISO (ver §1): `ftyp` na posição certa basta para MP4/MOV; EBML exige `DocType=webm`. |
| U4 | AJUSTAR | Não existe tabela de intent. Trocar por: caminho fora do padrão `uploads/<productId>_<uuid>.<ext>`, caminho de outro produto, tamanho 0 e 50 MiB + 1, tipo não aceito, bruto inexistente (já consumido) → rejeição antes de processar. |
| U5 | AJUSTAR | Entrada é o texto real do `ffmpeg -i` (guardar exemplos reais como fixture de texto): duração presente, `N/A`, sem fluxo de vídeo, dimensão extrema, 15,5 s e 15,51 s. |
| U6 | APROVADO | Rotação: só leitura/registro (a rotação é aplicada pelo autorotate). HDR: `arib-std-b67` e `smpte2084` ligam a cadeia; SDR e ausência de tag não ligam. |
| U7 | APROVADO | Incluir quadrado 1080×1080 → 720×720. |
| U8 | AJUSTAR | Política fixa: `-fpsmax 30` + keyframe por tempo. O teste confere os argumentos; a prova real é I3. |
| U9 | APROVADO | Teto injetável para forçar a recodificação e o erro final. |
| U10, U11, U12 | APROVADO | — |
| I1–I4, I6, I7, I9 | APROVADO | I7 precisa de padrão assimétrico (ex.: faixa colorida num canto) e de conferir a cor no canto esperado da saída. |
| I5 | APROVADO | Limiar 0,95; referência sem perdas com a mesma cadeia. Usar conteúdo com detalhe e movimento, não cor chapada. |
| I8 | AJUSTAR | **Sem condição**: se o binário não tiver `zscale`/`tonemap`/`libx265`, o teste falha — é exatamente o que precisamos saber antes de publicar. |
| A1–A5 | APROVADO | A2: incluir `Sec-Fetch-Site: cross-site` → 403. |
| A6 | AJUSTAR | Sem intent: dois processamentos intercalados do mesmo produto; conferir que nenhum apaga o caminho que ficou no banco e que o perdedor é só um órfão (não um produto quebrado). |
| A7 | AJUSTAR | Sem lease: regra é idade ≥ 30 min + não ser o `video_path` atual + não referenciado; listagem paginada; erro de listagem não apaga nada. |
| A8 | APROVADO | — |
| Tempo no CI | APROVADO | Aceito até ~90 s a mais. Testes com ffmpeg num arquivo só, em série. |

Com esses ajustes, os dois planos estão validados e a execução pode começar.

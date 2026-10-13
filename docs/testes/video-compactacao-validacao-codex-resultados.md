# Compactação de vídeo — validação final dos resultados e revisão adversarial

Data: 2026-10-11 · Escopo: estado atual da branch `feat/compactacao-de-video` · Revisão somente leitura, sem rede, sem `git`, sem `build` e sem alterações além deste relatório.

## 1. Reexecução na sandbox

| Comando | Resultado real | Tempo observado | Observações |
| --- | --- | ---: | --- |
| `npm.cmd run lint` | **PASSOU** (exit 0) | 84,1 s | `eslint .`; sem erros ou avisos impressos. |
| `npm.cmd run typecheck` | **PASSOU** (exit 0) | 11,8 s | `tsc --noEmit`; sem erros. |
| `npm.cmd test` | **PASSOU** (exit 0): **26 arquivos, 118 testes** | 35,4 s de parede; Vitest 30,08 s | Aviso não bloqueante do Vite sobre ESM em `vitest.config.ts`. A linha `[video-orcamento]` **não apareceu na saída**. |
| `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder npm.cmd test` | **PASSOU** (exit 0): **26 arquivos, 118 testes** | 39,9 s de parede; Vitest 33,60 s | Mesmo aviso do Vite. A linha `[video-orcamento]` **também não apareceu**. |

O caso de orçamento existe em `lib/media/video/video.integration.test.ts:177-192` e contém o `console.info` em `:187`, mas o reporter padrão desta instalação não o mostrou em nenhuma das duas execuções. Logo, esta rodada confirma que o teste passou, porém **não reproduz localmente os bytes/tempo alegados para a linha de CI**. `vitest list` confirmou 53 casos expandidos nos 9 arquivos novos de vídeo; os 10 blocos do arquivo de integração viram 12 casos pela matriz de três dimensões, portanto a contagem “12 executando ffmpeg real” é coerente.

Não rodei `npm run build`: o pedido proíbe rede/build e exige registrar somente os quatro comandos acima. Também não revalidei GitHub Actions, Vercel ou Supabase, pois esta rodada é offline.

## 2. Confronto entre resultados, planos e validação do Claude

| Bloco | Parecer | Confronto objetivo |
| --- | --- | --- |
| E1–E11 | **CONFERE COM RESSALVA** | Bytes e conversões para MiB conferem (por exemplo, 2.919.605 B = 2,784 MiB; tetos de 3 MiB = 3.145.728 B e 4 MiB = 4.194.304 B). Durações, resoluções e maior tempo também são internamente coerentes. E7 respeita o limiar SSIM ≥ 0,95, mas a métrica de A4 só compara depois do tone mapping e não prova fidelidade HDR; isso está corretamente ressalvado. E8 e as medições externas não têm fixtures/logs versionados nesta árvore, portanto são evidência narrativa não reproduzível nesta rodada. A recodificação de segurança não ocorreu em E1–E11; só foi forçada por teto injetado no automatizado. |
| Automatizados / CI | **CONFERE COM RESSALVA** | Reproduzi 26 arquivos/118 testes nas duas configurações e confirmei por listagem 53 casos nos 9 arquivos de vídeo, 12 deles na integração real. Contudo, o texto afirma que a corrida/idempotência A6 está coberta; não há teste com dois processamentos intercalados ou repetição idempotente. Há testes de ordem, rollback e faxina, mas não A6. A linha `[video-orcamento]` e os números Linux 31.908.916 → 2.311.943 B em 7,3 s não apareceram localmente e dependem do log externo do CI. Build/CI Linux não puderam ser revalidados offline. |
| B1–B8 | **CONFERE COM RESSALVA** | B1 tem bytes/MIME coerentes com a migration. B2–B4, B6 e B7 são relatos de stage sem artefato local novo. B5 **não cumpre o plano validado**, que exigia pedido HTTP para caminho existente: foi usado caminho inexistente, então prova apenas a resposta do endpoint/bucket, não a impossibilidade de ler um bruto real anonimamente. B8 e os testes de URL expirada/50 MiB foram honestamente marcados não executados. |
| Rota local | **CONFERE COM RESSALVA** | Os status narrados são compatíveis com a implementação e os testes automatizados (403/401/405 e bloqueio antes do trabalho). Não foram reexecutados em `next start` nesta rodada, pois isso exigiria build proibido. R3 é relatado, mas não há evidência versionada da sessão local. |
| V1–V4 | **CONFERE COM RESSALVA** | V2 e V4 estão corretamente declarados não provados. V3 foi conferido estaticamente: não existe rota/trecho de diagnóstico ou `VERCEL_ENV` no código atual. Em V1, 30,49 MB **compactados** não demonstram diretamente o limite de 250 MB **descompactados**; o deploy aceito é um indício operacional, não prova de execução do binário. Há ainda uma incoerência documental: `video-compactacao-validacao-claude.md:28` diz que houve prova no preview com `ffmpeg -version`, enquanto os resultados finais dizem que a rota de diagnóstico nunca foi criada e V2 não foi provado. |
| N1–N8 | **CONFERE** | O plano permitia marcar todo o bloco como não executado se não houvesse sessão admin. O resultado faz exatamente isso e não transforma cobertura por partes em ponta a ponta real. |

### Itens sumidos, limiares e honestidade

| Verificação | Conclusão |
| --- | --- |
| Limiar afrouxado | **Não encontrei.** Permanecem 50 MiB bruto, 15,5 s de tolerância, alvo 3 MiB, teto 4 MiB, ≤30 fps e SSIM ≥0,95. O roteiro final fala “Y ≤ 3 MB”; deveria dizer **MiB** para não reintroduzir ambiguidade. |
| Números incoerentes | As conversões de bytes/MiB, tempos e 26/118/53/12 conferem. “196 KB/s” é arredondamento decimal do pior caso, não 196 KiB/s; convém rotular explicitamente. A linha `[video-orcamento]` não foi emitida localmente, portanto seus números continuam sem reprodução nesta rodada. |
| Item do plano ausente | A6 concorrente/idempotente foi declarado coberto, mas sumiu da suíte. B5 com objeto existente não ocorreu. R2 (“fotos sem mudança de comportamento”) tem cobertura automatizada parcial, porém não houve reenvio real de foto nesta rodada final. |
| “O que NÃO foi testado” | **Incompleto.** A lista é honesta sobre Vercel, navegador, celulares, HDR e rede móvel, mas deveria acrescentar: B5 com objeto existente; URL assinada expirada; upload real de 50 MiB; V4 no preview; recodificação de segurança disparada por conteúdo real; corrida A6 real/automatizada; comportamento de foto no navegador; e recuperação autônoma de saída pública órfã quando nunca mais há ação naquele produto. |

## 3. Revisão adversarial do código final

### Achados

| Severidade | Local | Cenário concreto de falha | Correção sugerida |
| --- | --- | --- | --- |
| **BLOQUEANTE** | `app/admin/(painel)/midia/actions.ts:179-182` | `removeProductVideo` ignora o `error` da consulta de referências. Se dois produtos compartilham o mesmo `video_path` (o schema não impõe unicidade) e a consulta falha/transitoriamente retorna `data: null`, `!references?.length` vira verdadeiro e o arquivo é apagado, quebrando o vídeo do outro produto. O mesmo fluxo também não confirma que o `update` da linha 177 afetou uma linha. | Desestruturar e testar `referenceError`; em erro, falhar fechado e **não remover** o objeto. Fazer o `update(...).eq(...).select('id').single()` (idealmente condicionado ao caminho antigo) e só limpar após comprovar uma linha alterada. Adicionar testes para erro de referência, zero linhas e caminho compartilhado. |
| **BLOQUEANTE** | `app/admin/(painel)/midia/actions.ts:37-50` | `canDeleteImagePath` descarta os erros das três consultas e converte `data` ausente em “sem referência”. Ao trocar/remover uma foto, uma falha na consulta da tabela que ainda referencia o caminho pode apagar `-detail.webp`/`-card.webp`, deixando outro produto, destaque ou categoria com foto quebrada. É regressão real possível no envio/remoção de fotos. | Se qualquer consulta tiver `error` ou `data === null`, registrar e retornar `false` (fail closed). Cobrir falha individual de cada tabela e referência compartilhada. |
| **IMPORTANTE** | `app/admin/(painel)/midia/video/route.ts:142-145`; `actions.ts:75,114,138,177` | Updates do PostgREST são tratados como sucesso apenas porque `error` é nulo; zero linhas afetadas também pode retornar sem erro (registro removido concorrente ou RLS mudando no meio da operação). Na rota, isso marca `outputLinked = true`, pode responder sucesso e deixar a saída órfã; nos fluxos de mídia, a limpeza seguinte pode apagar o arquivo antigo ainda apontado pelo banco. | Exigir representação/cardinalidade (`.select('id').single()`) e, nas trocas, usar condição otimista pelo caminho antigo. Só marcar vínculo e limpar o anterior após uma linha confirmada. |
| **IMPORTANTE** | `app/admin/(painel)/midia/video/route.ts:107-143`; `lib/media/video/compress.ts:91-93` | Só o ffmpeg recebe orçamento de 150 s, contado a partir de `compressVideoFile`. Download do bruto, materialização do Blob, upload e operações SQL não têm deadline. Na Vercel, um download lento pode consumir parte relevante dos 180 s e ainda liberar 150 s ao ffmpeg; na VPS, `maxDuration` não é um cancelador da aplicação e uma chamada de Storage/DB travada pode prender a requisição indefinidamente. | Criar deadline da rota desde a entrada, reservar tempo para upload/commit/cleanup e propagar `AbortSignal`/timeouts ao cliente HTTP/Supabase. Passar ao ffmpeg apenas o tempo restante. Testar download/upload pendente e orçamento total. |
| **IMPORTANTE** | `app/admin/(painel)/midia/video/route.ts:120-127`; `lib/media/video/storage-cleanup.ts:58-76`; `actions.ts:157-161,184-187` | Se a função for encerrada depois do upload público e antes do vínculo/`finally`, a saída só é varrida quando houver novo envio ou remoção **do mesmo produto**. Se isso nunca ocorrer, o MP4 público fica órfão permanentemente; o próprio relatório admite a limitação. | Criar faxina periódica/global ou registro de intent/estado que permita reconciliar saídas não vinculadas. No mínimo, job administrativo que percorra pastas e referências, com idade de segurança e paginação. |
| **IMPORTANTE** | `lib/media/client-video.ts:33-41` | A promessa de metadados não tem timeout nem listeners alternativos. Em Safari/codec não suportado/arquivo malformado, pode não ocorrer `loadedmetadata` nem `error`; o painel fica `busy` indefinidamente e nunca deixa o servidor decidir, contrariando o fallback planejado para HEVC. | Resolver `null` após timeout curto, limpar handlers e descarregar `video.src`; cobrir o caso sem eventos. |
| **MENOR** | `components/admin/product-media-manager.tsx:51-60` | A prévia Blob da foto é instalada antes do upload e nunca revogada. Se o upload falhar, a tela continua mostrando a foto nova embora o produto mantenha a antiga; seleções repetidas também acumulam object URLs durante a sessão. | Revogar a URL anterior e restaurar a prévia persistida quando o upload falhar. |

### Verificações sem achado bloqueante adicional

- O painel não possui atalho para publicar bruto: ele assina em `product-video-uploads` e chama a rota de compactação. Um admin ainda pode escrever MP4 ≤4 MiB diretamente no bucket público por API, exceção já documentada; isso não é um bypass do fluxo do painel.
- O ffmpeg é iniciado com `shell: false`, argumentos em array, demuxer forçado, `-nostdin`, whitelist `file`, primeiro stream de vídeo e limites de tamanho/dimensão/tempo. Não identifiquei interpolação de path em shell ou abertura HTTP/concat.
- Respostas não expõem URL assinada, token, cookie ou detalhe interno do ffmpeg. O `path` retornado no sucesso é o caminho público esperado. Os logs da rota reduzem erro inesperado a texto fixo; não encontrei vazamento de segredo nesse fluxo.
- `ffmpeg-static` está em `dependencies` com versão exata e há tracing explícito. Isso reduz o risco de pacote ausente, mas execução/permissão/tempo/memória na Vercel continuam não provados.

Há **2 achados BLOQUEANTES**; portanto, não é correto afirmar que o código final está livre de bloqueantes.

## 4. Provas obrigatórias em stage antes da produção

1. Corrigir e testar os dois bloqueantes, incluindo erro de consulta, mídia compartilhada e update com zero linhas; repetir lint, typecheck e 118+ testes.
2. Executar a rota real na Vercel com login, vídeo Android e MOV/HEVC/HDR real; registrar tempo total, pico de memória, versão/permissão do binário, bytes antes/depois, resolução, cor e reprodução.
3. Executar N1–N8 completos: envio, progresso, publicação, player sem preload antes do toque, troca, rejeições, remoção e produto sem foto.
4. Provar B5 com objeto privado existente, expiração da URL assinada, upload real próximo de 50 MiB e B8 após sucesso/falhas.
5. Simular duas compactações concorrentes do mesmo produto e interrupção após upload público; provar vencedor correto e limpeza posterior/autônoma dos órfãos.
6. Testar download/upload Supabase lentos ou pendentes contra o deadline total de 180 s e, na VPS atrás do proxy, mesma origem, host/protocolo encaminhados, `/tmp` e `FFMPEG_PATH`/permissão.
7. Reenviar e remover fotos no navegador, inclusive falha nas consultas de referência, para provar ausência de regressão.
8. Antes da migration de produção, contar vídeos existentes e confirmar que nenhum caminho/objeto legado será invalidado pelo novo limite/MIME.

## Veredito

**REPROVADO — 2 caminhos fail-open podem apagar mídia ainda referenciada; corrigir e repetir a validação antes do merge em `develop`.**

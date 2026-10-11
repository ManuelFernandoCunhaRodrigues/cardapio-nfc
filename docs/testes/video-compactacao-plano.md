# Compactação de vídeo dos produtos — plano e decisão de arquitetura

Data: 2026-10-10 · Branch: `feat/compactacao-de-video` · Protocolo: [testes cruzados](../../Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/11-Agentes-de-IA.md)

Pedido do responsável: **"o vídeo deve ficar sempre leve, para o cliente conseguir ver com facilidade, e com boa qualidade"**.

## 1. Situação atual

- O painel só valida o vídeo (MP4/WebM, até 15 s, até 10 MB) e o arquivo vai do navegador direto para o bucket público `product-videos` por URL assinada. Uma server action confirma que o objeto existe e grava `products.video_path`.
- Não há compactação. O servidor não confere duração, codec nem resolução: confia no navegador.
- Um vídeo comum de celular reprova: 15 s em 1080p/30 fps pesam de 25 a 35 MB (medido nas amostras abaixo). No iPhone o arquivo costuma chegar como `.mov` (`video/quicktime`), tipo que o painel hoje recusa.
- Em stage não há nenhum produto com vídeo (`select count(*) from products where video_path is not null` = 0, conferido em 2026-10-10) e o bucket `product-videos` está vazio.

## 2. Opções comparadas

### Opção 1 — compactar no navegador, antes do envio

| Técnica | Suporte real | Tempo em celular modesto | Peso do download | Qualidade |
| --- | --- | --- | --- | --- |
| WebCodecs + demuxer/muxer em JS | Chrome Android: sim. Safari iOS: só a partir do 16.4. Ler HEVC/`.mov` depende do decodificador de hardware de cada aparelho. | Rápido quando o hardware ajuda; imprevisível quando não. | 100–300 KB de biblioteca. | **Imprevisível**: o codificador é o chip do aparelho, sem CRF; cada fabricante entrega uma qualidade diferente para o mesmo bitrate. Não dá para medir uma vez e garantir para todos. |
| MediaRecorder (regravar o vídeo tocando) | Chrome grava WebM (MP4 só nas versões recentes); Safari grava MP4 fragmentado, sem `faststart`. | Tempo real ou pior (15 s de vídeo = 15 s+), perde quadros se a aba perder foco. | Zero. | Ruim de controlar: sem resolução/bitrate garantidos, quadros perdidos. |
| ffmpeg.wasm | Funciona, mas a versão rápida (multi-thread) exige isolamento de origem (COOP/COEP), que quebra outras partes do site; a versão simples é de uma thread só. | **Minutos** para 1080p/15 s; no iPhone a aba costuma ser encerrada por memória. | ~30 MB de WebAssembly. | Boa (é o x264), mas inviável pelo tempo e pela memória. |

Conclusão: nenhuma técnica de navegador entrega ao mesmo tempo "funciona no celular de qualquer pessoa da equipe" e "qualidade previsível e medida". Além disso, o navegador nunca é fonte de confiança: o servidor teria de validar tudo de novo.

### Opção 2 — compactar no servidor, depois do envio (ffmpeg)

- O bruto continua subindo direto do navegador ao Storage (o corpo de uma função da Vercel é limitado a 4,5 MB, então o arquivo não pode passar pela função).
- Uma função Node baixa o bruto, roda `ffmpeg` (pacote `ffmpeg-static`, binário estático com `libx264`), publica o resultado e apaga o bruto.
- Limites do plano Hobby da Vercel (documentação consultada em 2026-10-10): **300 s** de duração máxima, **2 GB / 1 vCPU**, pacote da função de até **250 MB** descompactado, `/tmp` gravável. O binário do ffmpeg tem ~80 MB: cabe.
- Tempo medido nesta máquina com **uma thread** (aproximação de 1 vCPU): 10–17 s para 1080p/15 s; 23 s para HDR de iPhone (ver §4). Cabe com folga nos 300 s. **Precisa ser provado no deploy de preview**, porque inclusão do binário no pacote, permissão de execução e tempo real na Vercel não se provam localmente.
- Na VPS futura fica trivial: `npm ci` baixa o binário para Linux sozinho (ou `apt install ffmpeg` + variável `FFMPEG_PATH`), sem limite de tempo nem de pacote.
- Qualidade **determinística**: mesmo codificador, mesmos parâmetros, mesma saída para qualquer celular. Dá para medir (SSIM/PSNR) e travar em teste automatizado.

### Opção 3 — híbrido / fila

- Fila com worker (cron, Supabase Edge Function, serviço externo de vídeo): Edge Functions não rodam ffmpeg nativo; o cron do Hobby é diário; serviço externo é conta e custo novos. Para uma lanchonete que envia alguns vídeos por mês, é infraestrutura demais.
- Híbrido "tenta no navegador, cai para o servidor": dois caminhos de código, duas qualidades diferentes e o dobro de testes para o mesmo resultado.

### Decisão

**Opção 2: compactação no servidor com ffmpeg (`ffmpeg-static`), síncrona, numa rota Node dedicada.** Motivos para ESTE projeto: (a) quem envia usa o celular que tiver — a qualidade não pode depender do aparelho; (b) o volume é minúsculo (um vídeo por produto), então processar na hora, sem fila, é o mais simples que funciona; (c) cabe nos limites do Hobby com folga medida; (d) é o mesmo código na VPS; (e) o servidor passa a ser a fonte de verdade para duração, tipo real e formato — hoje não é.

Custo assumido: a pessoa espera a compactação com a tela aberta (estimativa: 15–40 s depois do envio). A interface mostra as duas etapas ("Enviando…" com percentual e "Compactando…").

## 3. Especificação

### 3.1 Saída (o que o cliente recebe)

| Item | Valor | Por quê |
| --- | --- | --- |
| Contêiner | MP4 com `moov` no início (`-movflags +faststart`) | Começa a tocar antes de baixar tudo. |
| Vídeo | H.264 (`libx264`), perfil High, nível 3.1, `yuv420p` (8 bits, SDR) | Toca em qualquer celular desde ~2012, iPhone incluído. |
| Áudio | **Removido** (`-an`) | O vídeo toca mudo; áudio só pesaria. |
| Resolução | Cabe em 1280×720 (paisagem) ou 720×1280 (retrato); **nunca amplia**; lados pares; rotação do celular aplicada nos pixels | O detalhe do produto mostra o vídeo com no máximo 480 px CSS de largura; 720p cobre telas de alta densidade. |
| Quadros | Máximo 30 fps (`-fpsmax 30`); origem com menos fps é preservada, inclusive taxa variável (os tempos originais dos quadros são mantidos) | 60 fps dobraria o peso sem ganho para comida. |
| Controle de taxa | CRF 24 com teto `-maxrate 1500k -bufsize 2250k`, preset `veryfast`, keyframe a cada 2 s **por tempo** (`-force_key_frames`), não por contagem de quadros | CRF dá qualidade constante; o teto (VBV) limita o total a `1500k × duração + 2250k` bits: no máximo ~3,0 MiB para 15 s. |
| Rede de segurança de tamanho | Se, apesar do teto, a saída passar de 4 MiB, uma única recodificação mais apertada (CRF 28, `-maxrate 1000k -bufsize 1000k`); se ainda passar, erro e o vídeo anterior é mantido | O VBV do x264 é um limite forte, mas não uma prova matemática para todo conteúdo. |
| Metadados | Removidos (`-map_metadata -1`), inclusive **localização GPS** que o celular grava | Mesma regra das fotos. |
| HDR (iPhone, HLG/PQ 10 bits) | Convertido para SDR BT.709 com tone mapping (`zscale` + `tonemap=hable`) | Sem isso as cores ficam lavadas em telas comuns. |

**Alvo de tamanho: até 3 MiB (3.145.728 bytes) para 15 s** (≈ 200 KB por segundo; típico 1–2,5 MB). Justificativa: (1) com teto de 1,5 Mbit/s o vídeo toca em tempo real mesmo num 4G fraco de 2 Mbit/s, e com `faststart` começa em ~1 s; (2) é 10–15× menor que o bruto; (3) no plano Free do Supabase (5 GB de tráfego/mês) cabem mais de 1.600 reproduções completas por mês; com os 10 MB de hoje caberiam 500. Limite duro do bucket publicado: 4 MiB (4.194.304 bytes; folga sobre o teto do VBV e sobre a tolerância de 15,5 s).

**Limiar de qualidade: SSIM ≥ 0,95** entre a saída e uma referência sem perdas com a mesma geometria (mesmo redimensionamento e mesmos quadros). Abaixo disso o teste de ponta a ponta reprova. Nas medições preliminares (§4) o pior caso SDR ficou em 0,974.

A foto continua obrigatória: é a capa (poster) e o fallback. O player não muda (`preload="none"`, toca mudo, só carrega no toque).

### 3.2 Entrada (o que o painel aceita)

| Item | Antes | Agora | Por quê |
| --- | --- | --- | --- |
| Tipos | MP4, WebM | MP4, **MOV (QuickTime)**, WebM | iPhone entrega `.mov`. |
| Codecs | o que viesse | qualquer um que o ffmpeg decodifique (H.264, HEVC, VP8/VP9, AV1) | A saída é sempre H.264. |
| Tamanho do bruto | 10 MB | **50 MiB (52.428.800 bytes)** | 1080p/30 fps de 15 s pesa 25–35 MB. 50 MB é também o teto por arquivo do Supabase Free. 4K (≈ 90 MB) continua recusado, com orientação para gravar em 1080p. |
| Duração | 15 s (só no navegador) | 15 s, com tolerância até **15,5 s**, validada **no servidor** | Celulares gravam "15 s" como 15,0x s. |
| Tipo real | não conferido | assinatura do arquivo (`ftyp` → MP4/MOV; EBML com `DocType=webm` → WebM) + demuxer forçado (`-f mov` / `-f matroska`) + `-protocol_whitelist file` + `-nostdin` | Extensão e MIME vêm do navegador e não são confiáveis; forçar o demuxer e restringir protocolos impede que um arquivo-playlist disfarçado faça o ffmpeg abrir outros arquivos/URLs. |
| Limites de recurso | nenhum | quadro de entrada de no máximo 4096 px por lado e 8.847.360 pixels (4K); exatamente o primeiro fluxo de vídeo é usado (`-map 0:v:0`), o resto é descartado; tempo máximo para a leitura (10 s) e para a codificação (ver §3.3); processo sempre encerrado no estouro | Evita que um arquivo malformado ou gigante prenda a função. |

### 3.3 Fluxo

1. **Navegador** valida tipo, tamanho (≤ 50 MB) e, quando consegue ler os metadados, duração (≤ 15,5 s). Se o navegador não consegue ler (ex.: HEVC no desktop), segue: quem decide é o servidor.
2. **Server action `createProductVideoUpload`** (admin): exige foto de capa, faz a faxina (item 6) e devolve URL assinada para o bucket **privado** `product-video-uploads`, caminho plano `uploads/<productId>_<uuid>.<ext>` (plano para a faxina listar tudo de uma vez). O tamanho informado pelo navegador é conferido antes de assinar a URL; o limite real é o do bucket.
3. **Navegador** envia o bruto direto ao Storage, com barra de progresso.
4. **Rota `POST /admin/midia/video`** (Node, `maxDuration = 180` s; orçamento interno de 150 s para o ffmpeg). Antes de qualquer trabalho: `Origin` presente e igual ao host da própria requisição (ausente, `null` ou de outro site → 403), `Sec-Fetch-Site` — quando enviado — igual a `same-origin`, sessão válida (401) e perfil admin ativo (403), corpo válido (400). Nenhum cabeçalho CORS. Depois: baixa o bruto para o diretório temporário do sistema, confere a assinatura, lê duração/fluxos, compacta, confere a saída (H.264, sem áudio, `moov` antes de `mdat`, duração, tamanho ≤ 4 MB), envia para `product-videos/products/<productId>/<uuid>.mp4` com cache longo, relê o `video_path` atual imediatamente antes de gravar, atualiza `products.video_path` e só então apaga o vídeo anterior (mesma ordem segura já usada: `commitStagedMedia`). Registra auditoria com tamanhos de antes e depois.
5. **Sempre, com sucesso ou erro (`finally`)**: apaga o bruto do bucket privado e os arquivos temporários.
6. **Faxina de órfãos** (para o caso de a função ser encerrada no meio ou de a aba ser fechada): ao preparar um novo envio e ao remover um vídeo, apaga objetos de `product-video-uploads` com mais de 30 minutos e, na pasta do produto em `product-videos`, qualquer arquivo com mais de 30 minutos que não seja o `video_path` atual (relido na hora) nem esteja referenciado por outro produto. A listagem é paginada e um erro de listagem **não** é tratado como lista vazia (a faxina é pulada e registrada). Por que 30 minutos é seguro: um objeto só passa a existir no Storage quando o envio termina, e a partir daí a função vive no máximo 180 s — nenhum envio ou processamento em andamento tem objeto com 30 minutos.

### 3.4 Falhas — nunca vídeo quebrado, nunca órfão

| Situação | O que acontece | Mensagem |
| --- | --- | --- |
| Arquivo não é vídeo / corrompido | Bruto apagado; produto intacto | "Este arquivo não é um vídeo válido. Escolha outro vídeo." |
| Duração acima de 15,5 s | Idem | "O vídeo deve ter no máximo 15 segundos." |
| Acima de 50 MB | Recusado no navegador e pelo limite do bucket | "O vídeo deve ter no máximo 50 MB. Grave em Full HD (1080p), não em 4K." |
| ffmpeg falha ou passa do tempo interno | Processo encerrado, temporários e bruto apagados; produto intacto (o vídeo anterior continua no ar) | "Não foi possível compactar este vídeo. Tente um vídeo mais curto ou gravado em Full HD." |
| Função encerrada pela plataforma (504) | Produto intacto, porque `video_path` só muda no fim; bruto/saída parcial saem na faxina do próximo envio | "A compactação demorou mais que o esperado. Tente novamente." |
| Falha ao gravar `video_path` | Saída nova apagada (rollback); vídeo anterior mantido | "O vídeo foi compactado, mas não pôde ser vinculado ao produto. Tente novamente." |

O atalho antigo (`confirmProductVideoUpload`, que publicava o arquivo sem compactar) é **removido**. O bucket `product-videos` passa a aceitar só `video/mp4` de até 4 MB, então nem uma chamada direta à API consegue publicar um bruto pesado.

### 3.5 Banco — migration nova

`supabase/migrations/20261011003026_video_compression_storage.sql`:

- cria o bucket **privado** `product-video-uploads` (50 MB; `video/mp4`, `video/quicktime`, `video/webm`);
- políticas em `storage.objects` para esse bucket: `select`, `insert`, `update` e `delete` somente para `authenticated` com `private.is_admin()`; nada para `anon`;
- altera `product-videos`: `file_size_limit` 4 MB e `allowed_mime_types` `{video/mp4}` (objetos já existentes não são afetados; o limite vale para envios novos).

Sem `service_role`: tudo roda com a sessão do admin, como hoje. Aplicar **somente no stage** nesta entrega; produção fica para a sessão principal.

### 3.6 Vídeos já publicados

Não precisam de reprocessamento: não existe nenhum em stage, e a produção está sem conteúdo. Vídeos antigos (se existirem) continuam tocando, porque o player e o caminho não mudam. A promoção deve conferir em produção com `select count(*) from products where video_path is not null`; se houver algum, basta reenviá-lo pelo painel.

### 3.7 Empacotamento no Next 16 / Vercel

- `ffmpeg-static` em `dependencies`, versão exata; `serverExternalPackages: ['ffmpeg-static']` para o bundler não tentar empacotar o binário;
- `outputFileTracingIncludes` apontando `node_modules/ffmpeg-static/ffmpeg*` para a rota de compactação, para o binário entrar no pacote da função;
- `FFMPEG_PATH` (opcional) permite usar um ffmpeg do sistema na VPS;
- o binário é GPL (inclui x264): é executado como programa separado, não ligado ao código; registrar no README.

## 4. Medições preliminares (base dos números acima)

ffmpeg 6.1.1 (`ffmpeg-static` 5.3.0), **1 thread**, Ryzen 3 7320U. Amostras sintéticas geradas com ffmpeg (fractal em zoom + ruído de sensor, e padrão de teste com ruído), com bitrates de celular.

| Amostra | Bruto | Saída | Tempo | SSIM | Resolução |
| --- | --- | --- | --- | --- | --- |
| Retrato 1080×1920, H.264, 12 s | 25,0 MB | 2,3 MB | 10,4 s | 0,974 | 720×1280 |
| Paisagem 1920×1080, H.264, 15 s (padrão de teste) | 31,5 MB | 2,1 MB | 11,7 s | 0,987 | 1280×720 |
| Paisagem 1920×1080, H.264, 15 s (fractal) | 29,6 MB | 2,8 MB | 16,6 s | 0,979 | 1280×720 |
| iPhone `.mov` HEVC com rotação 90°, 10 s | 11,8 MB | 1,9 MB | 12,2 s | 0,979 | 720×1280 |
| 4K 30 fps, 10 s | 43,7 MB | 0,8 MB | 9,9 s | 0,994 | 1280×720 |
| HEVC 10 bits HLG (HDR), 10 s | 13,1 MB | 1,9 MB | 23,3 s | — | 1280×720 |

Comparação de presets na amostra retrato (mesmo teto): `veryfast` 0,974 em 10 s; `fast` 0,976 em 19 s; `medium` 0,977 em 20 s. O ganho de qualidade dos presets lentos é desprezível perto do tempo: fica `veryfast`.

## 5. O que este plano não cobre

- Vídeo real gravado por celular (as amostras são sintéticas): fica no roteiro de celular real (H6), junto com iPhone de verdade.
- Vídeo em destaques (banners): fora do escopo; só produtos.
- Reprodução adaptativa (HLS): desnecessária para 15 s e 3 MB.

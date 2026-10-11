# Compactação de vídeo — resultados reais

Data: 2026-10-10 e 2026-10-11 · Branch `feat/compactacao-de-video` · PR [#24](https://github.com/ManuelFernandoCunhaRodrigues/cardapio-nfc-9d/pull/24)

Planos e validações: [arquitetura](video-compactacao-plano.md) · [plano do Claude](video-compactacao-plano-claude.md) · [plano do Codex](video-compactacao-plano-codex.md) · [validação do Codex](video-compactacao-validacao-codex.md) · [validação do Claude](video-compactacao-validacao-claude.md).

Legenda: ✅ passou · ⚠️ passou com ressalva · ❌ falhou · ⛔ **não executado** (com o motivo).

## Resumo honesto

- A compactação funciona e cumpre os limiares em **8 vídeos de verdade** na máquina de desenvolvimento e nos testes automatizados do **CI em Linux** (mesmo binário que a Vercel instala).
- **Não foi provado dentro da Vercel.** O deploy de preview do PR existe, compilou e a função da rota foi criada com o binário, mas os previews do projeto `salgae-homologacao` exigem login da Vercel e o Claude Code não tem essa sessão (nem digita senha). O único atalho por linha de comando (`vercel curl`) criaria um segredo permanente de "bypass" nas configurações de segurança do projeto — não foi feito. **A primeira execução real na Vercel precisa ser conferida em stage antes de ir para produção** (roteiro no fim).
- **O fluxo pelo painel no navegador não foi executado**: não há sessão de administrador de stage no navegador de teste (nem em `localhost`, nem no stage) e o Claude Code não digita senha nem cria conta.

## 1. Ponta a ponta com vídeos de verdade (E1–E11)

Código real do projeto (`compressVideoFile`), sem mock, ffmpeg 6.1.1 (`ffmpeg-static` 5.3.0), **limitado a 1 thread** (decodificação, filtros e codificação) para aproximar 1 vCPU. Máquina: Ryzen 3 7320U, Windows 11. Amostras sintéticas geradas com ffmpeg em bitrates de celular (fractal em zoom com ruído de sensor; padrão de teste com ruído), fora do repositório. Execução final em 2026-10-11, sobre o código do PR.

Qualidade: SSIM e PSNR entre a saída e uma **referência sem perdas** (`-qp 0`) produzida pela mesma cadeia (mesmo redimensionamento, mesmos quadros, mesma conversão de cor). Limiar do plano: **SSIM ≥ 0,95**.

| Amostra | Entrada | Saída | Redução | Duração | Resolução | Quadros/s | SSIM | PSNR | Tempo (1 thread) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 retrato H.264 | 25.588.322 B (24,4 MiB) | 2.358.399 B (2,25 MiB) | 10,8× | 12 → 12 s | 1080×1920 → 720×1280 | 30 → 30 | 0,956 | 32,6 dB | 17,2 s |
| A2 paisagem H.264, 15 s | 30.288.839 B (28,9 MiB) | 2.919.605 B (2,78 MiB) | 10,4× | 15 → 15 s | 1920×1080 → 1280×720 | 30 → 30 | 0,965 | 33,8 dB | 14,4 s |
| A3 iPhone `.mov` HEVC, rotação 90° | 12.078.076 B (11,5 MiB) | 1.976.970 B (1,89 MiB) | 6,1× | 10 → 10 s | 1920×1080 girado → 720×1280 | 30 → 30 | 0,964 | 33,5 dB | 11,8 s |
| A4 iPhone HDR (HEVC 10 bits HLG) | 13.396.480 B (12,8 MiB) | 1.980.031 B (1,89 MiB) | 6,8× | 10 → 10 s | 1920×1080 → 1280×720 | 30 → 30 | 0,961 | 32,8 dB | 23,6 s |
| A5 1080p a 60 fps | 29.864.368 B (28,5 MiB) | 1.442.858 B (1,38 MiB) | 20,7× | 10 → 10,07 s | 1920×1080 → 1280×720 | 60 → 30 | 0,975 | 29,1 dB | 10,1 s |
| A6 WebM VP9 1080p | 8.117.927 B (7,7 MiB) | 1.601.733 B (1,53 MiB) | 5,1× | 8 → 8 s | 1920×1080 → 1280×720 | 30 → 30 | 0,960 | 33,4 dB | 6,6 s |
| A7 pequeno 640×360 | 1.322.561 B (1,26 MiB) | 1.222.007 B (1,17 MiB) | 1,1× | 8 → 8 s | 640×360 → 640×360 | 30 → 30 | 0,974 | 33,8 dB | 1,5 s |
| A8 4K 30 fps | 44.746.350 B (42,7 MiB) | 842.537 B (0,80 MiB) | 53,1× | 10 → 10 s | 3840×2160 → 1280×720 | 30 → 30 | 0,982 | 32,0 dB | 9,0 s |

Em **todas** as oito saídas: um único fluxo `h264 (High)`, `yuv420p`, marcado BT.709; **nenhum** fluxo de áudio (7 das 8 entradas tinham áudio); caixas do MP4 na ordem `ftyp, moov, free, mdat` (`moov` antes de `mdat`); número de quadros idêntico ao da referência; recodificação de segurança não acionada.

| # | Resultado |
| --- | --- |
| E1 peso | ✅ 15 s → 2,78 MiB (alvo ≤ 3 MiB); maior saída 2.919.605 B (teto 4.194.304 B); maior taxa 196 KiB por segundo de vídeo. |
| E2 formato | ✅ H.264 High, `yuv420p`, 1 fluxo de vídeo, 0 de áudio nas 8 saídas. Nível conferido no teste automatizado pela caixa `avcC` (`profile_idc` 100, `level_idc` ≤ 31). |
| E3 início rápido | ✅ `moov` antes de `mdat` nas 8 saídas (parser de caixas). |
| E4 resolução e orientação | ✅ conforme a tabela. Rotação conferida também no olho: o quadro bruto deitado de A3 sai em pé, girado 90° no sentido indicado pela matriz; a saída não carrega matriz de rotação. |
| E5 quadros | ✅ todas ≤ 30 fps; A5 60 → 30 (302 quadros em 10,07 s). |
| E6 duração | ✅ diferença máxima 0,07 s (A5). |
| E7 qualidade | ✅ SSIM de 0,956 a 0,982 (limiar 0,95). ⚠️ A1 passa com pouca folga (0,956): é a amostra mais difícil (detalhe fino + ruído em retrato) e encosta no teto de 1,5 Mbit/s. A4 (HDR): a métrica mede só a perda do codificador depois da conversão de cor; a fidelidade da conversão HDR → SDR **não** fica provada com amostra sintética (ver "não testado"). |
| E8 privacidade | ✅ A1–A4 entraram com localização GPS, data de criação e (A3) marca/modelo do aparelho; nenhuma saída contém esses campos. |
| E9 tempo | ✅ 1,5 a 17,2 s para SDR; 23,6 s para HDR. Orçamento interno do ffmpeg: 150 s; `maxDuration` da rota: 180 s. Havia outros processos pesados na máquina durante a medição (tempos pessimistas). |
| E10 rejeições | ✅ texto renomeado → `video_invalid` (4 ms); MP4 sem cabeçalho → `video_invalid` (3 ms); 20 s → `video_too_long` (1,3 s, antes de codificar); 58 MiB → `video_too_large` (1 ms). |
| E11 limpeza | ✅ nenhum diretório temporário restante depois das 8 compactações e das 4 rejeições. |

## 2. Testes automatizados (plano do Codex) e CI

| Item | Resultado |
| --- | --- |
| `npm run lint` | ✅ sem erros |
| `npm run typecheck` | ✅ sem erros |
| `npm test` | ✅ 28 arquivos, **134 testes** (69 nos 11 arquivos novos de vídeo, 12 deles executando o ffmpeg de verdade) |
| `npm test` com `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` e `NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder` | ✅ 28 arquivos, 134 testes |
| `npm run build` | ✅ rota `ƒ /admin/midia/video` gerada; o rastreamento do build inclui `node_modules/ffmpeg-static/ffmpeg*` |
| CI do PR (GitHub Actions, `ubuntu-latest`, `npm ci`) | ✅ verde — lint, typecheck, testes e build. Execução do commit `32d926f` (antes das correções da rodada 6): 1 min 30 s, 118 testes. A execução do commit final está registrada no PR. |
| Binário **Linux** no CI | ✅ os 12 testes reais passaram com o binário Linux x64: H.264 High/3.1, sem áudio, `faststart`, SSIM, 60 → 30 fps, WebM, rotação por pixels, **HDR com `zscale` + `tonemap`**, WebM sem duração, rejeições e tempo esgotado |
| Orçamento de tempo em Linux, 1 thread | ✅ 1080p/30 fps/15 s com ruído: 31.908.916 B → 2.311.943 B em **7,3 s** (linha `[video-orcamento]` no log do CI; localmente ela só aparece com `npx vitest run --reporter=verbose`) |

O que os testes automatizados cobrem além dos reais: argumentos seguros (`-nostdin`, `-protocol_whitelist file`, demuxer forçado, sem shell), assinatura do arquivo, leitura do texto do `ffmpeg -i`, cálculo de dimensões, parser de caixas MP4, tempo esgotado (mata o processo e espera sair), cópia do binário para o temporário quando ele chega sem permissão de execução, faxina de órfãos (paginação, idade, nunca apagar o caminho atual, erro de listagem ≠ pasta vazia), a action de preparação do envio e a rota com Supabase simulado — 403 para origem inválida, 401 sem sessão, 403 sem perfil admin, 400 para caminho de outro produto, tudo **antes** de qualquer download ou ffmpeg; ordem enviar → gravar `video_path` → apagar o anterior; rollback quando o banco falha; bruto sempre apagado; vídeo recém-vinculado nunca apagado mesmo se a limpeza do anterior falhar; 504 com mensagem própria no estouro de tempo.

## 3. Banco e Storage em stage (B1–B8)

Migration `20261011003026_video_compression_storage.sql` aplicada **somente** em `SALGAE-STAGING` (`csirmtmerqpbhatruzaf`) pela ferramenta MCP; o arquivo foi nomeado com a versão que ficou registrada.

| # | Resultado |
| --- | --- |
| B1 buckets | ✅ `product-video-uploads`: privado, 52.428.800 B, `video/mp4`, `video/quicktime`, `video/webm`. `product-videos`: público, 4.194.304 B, só `video/mp4`. Buckets de imagem inalterados (1.048.576 B, `image/webp`). |
| B2 visitante | ✅ `insert` bloqueado (42501); `select` e `update` alcançam 0 linhas. |
| B3 usuário comum | ✅ idem (42501; 0; 0). |
| B4 admin | ✅ `insert`, `select` e `update` com 1 linha (dentro de transação com rollback). Script versionado: `supabase/tests/video_storage_rls.sql`. |
| B5 bruto não é público | ⚠️ `GET /storage/v1/object/public/product-video-uploads/...` e `GET /storage/v1/object/product-video-uploads/...` sem login → HTTP 400 `Bucket not found`. Feito com caminho inexistente: não foi possível criar um objeto real sem sessão de admin. |
| B6 migration rastreável | ✅ `list_migrations` em stage: versão `20261011003026`, nome `video_compression_storage`, uma única vez, igual ao nome do arquivo. |
| B7 advisors | ✅ nenhum aviso novo (só o antigo de proteção de senha vazada, que é configuração do Auth). |
| B8 sem órfãos | ⛔ depende do fluxo pelo navegador (N1–N7). Os dois buckets de vídeo de stage estão vazios. Regra coberta por testes automatizados. |
| URL assinada expirada, envio real de 50 MiB | ⛔ exigem sessão de admin. |

## 4. Rota no build de produção local (`next start`, sem sessão)

| Pedido a `/admin/midia/video` | Resposta |
| --- | --- |
| `POST` sem `Origin` | ✅ 403 JSON "Requisição não permitida." |
| `POST` com `Origin` de outro site | ✅ 403 |
| `POST` com `Origin: null` | ✅ 403 |
| `POST` da mesma origem com `Sec-Fetch-Site: cross-site` | ✅ 403 |
| `POST` da mesma origem, sem sessão | ✅ 401 JSON "Sua sessão expirou. Entre novamente." |
| `GET` | ✅ 405 |
| `OPTIONS` vindo de outro site | ✅ 204 sem nenhum cabeçalho `Access-Control-Allow-*` |

Regressão (R3): `/`, `/cardapio`, `/busca`, `/info`, `/produto/<id>` → 200; `/admin` e `/admin/produtos` sem sessão → 307 para o login.

## 5. Vercel — preview do PR (V1–V4)

Deploy de preview do commit `32d926f` no projeto `salgae-homologacao`: `dpl_8gut4UDyVbuRaRwebejGSHaJt9fW`.

| # | Resultado |
| --- | --- |
| V1 binário no pacote | ⚠️ Build do preview verde (31 s). A função `admin/midia/video` foi criada com **30,49 MB** compactados, contra 18,01 MB de todas as outras; `timeout=180`, `mem=2048`, `nodejs24.x`, região `iad1`. O tamanho maior é coerente com o binário incluído, mas isso é indício, não prova de execução. O número é do pacote **compactado**; o limite da plataforma é de 250 MB descompactados (o binário tem cerca de 77 MB descompactado) e o deploy foi aceito. |
| V2 ffmpeg rodando na Vercel | ⛔ **não provado.** O preview responde 302 para `vercel.com/sso-api` (proteção de deploy "Vercel Authentication" ligada para tudo que não é o domínio público). Sem login da Vercel não há como chamar a rota; `vercel curl` criaria um segredo de bypass nas configurações do projeto (hoje não existe nenhum) — mudança de segurança que não cabe a este agente. Por isso a rota de diagnóstico temporária prevista no plano **não foi criada**. |
| V3 diagnóstico removido | ✅ não se aplica: nunca entrou no repositório. |
| V4 rota protegida no preview | ⛔ mesmo bloqueio. Coberto localmente (seção 4) e por teste automatizado. |

O que continua sem prova e só aparece na Vercel: (a) o binário executar dentro da função (permissão de execução — há contorno automático no código — e arquitetura igual à da máquina de build); (b) tempo real com 1 vCPU; (c) memória; (d) tempo de baixar o bruto do Supabase (São Paulo) a partir da função (Virgínia, `iad1`).

## 6. Navegador — painel e cardápio (N1–N8)

⛔ **Não executados.** O navegador de teste não tem sessão de administrador (o painel redireciona para o login tanto em `http://localhost:3100` quanto em `https://salgae-homologacao.vercel.app`), e o Claude Code não digita senha nem cria conta. Consequência: o caminho completo "navegador → URL assinada → bucket privado → rota → bucket público → `video_path`" contra o Supabase real **não foi exercitado**; ele está coberto por partes (biblioteca com vídeo real, rota e action com Supabase simulado, políticas por SQL). O player público não mudou.

## 7. Matriz de falha por etapa

| Onde a função morre | O que sobra | Quem limpa | Produto |
| --- | --- | --- | --- |
| Antes de o envio do bruto terminar | nada (o objeto só existe quando o envio termina) | — | intacto |
| Depois do envio, antes da rota (aba fechada) | bruto no bucket privado | faxina do próximo envio, depois de 30 min | intacto |
| Durante o download/compactação | bruto + temporários | temporários morrem com a função; bruto na faxina | intacto |
| Depois de publicar a saída, antes de gravar | saída sem dono em `product-videos` | faxina da pasta do produto, depois de 30 min | intacto (vídeo anterior no ar) |
| Depois de gravar, antes de apagar o anterior | vídeo anterior sem dono | faxina da pasta do produto | já aponta para o novo |
| Falha ao gravar `video_path` | — (rollback apaga a saída nova) | a própria rota | intacto |

Limitação aceita: uma sobra na pasta de um produto que nunca mais recebe vídeo só sai quando o vídeo ou o produto for removido. Sobras são de no máximo 4 MiB (públicas, nome imprevisível) ou 50 MiB (privadas).

## 8. Divergências entre os agentes e como ficaram

| Tema | Codex | Claude Code | Ficou | Motivo |
| --- | --- | --- | --- | --- |
| Tabela de *upload intent* com lease/heartbeat | exigir | não | **sem tabela** | O objeto só existe após o envio e a função vive ≤ 180 s: idade ≥ 30 min + releitura do `video_path` na hora de apagar cobrem a corrida sem tabela nova. |
| Tamanho garantido | CRF + teto não garante | VBV limita | **os dois** | `bufsize` menor (teto ≈ 3 MiB) + recodificação de segurança + erro se ainda passar. |
| Rotação | `-noautorotate` + filtro manual | autorotate do ffmpeg | **autorotate** | Caminho único; provado por pixels. |
| Lista de marcas `ftyp` | exigir | não | **sem lista** | Recusaria celulares legítimos; demuxer forçado já limita a superfície. |
| Duração | `ffprobe` com PTS | sem `ffprobe` | **duração medida na saída** | Evita um segundo binário de ~60 MB; cobre WebM sem duração (testado). |
| Rota de diagnóstico no preview | reprovada | temporária e fechada | **não criada** | Sem acesso ao preview ela não serviria; o ponto do Codex prevaleceu na prática. |
| Só a rota publica | pedir credencial de servidor | sem `service_role` | **exceção registrada** | Admin ainda pode gravar MP4 ≤ 4 MiB direto pela API; o bucket limita o estrago. |
| Origem da requisição (achado do Claude na revisão) | comparava com `request.url` | comparar com `x-forwarded-host`/`host` | **corrigido** | Atrás de proxy (VPS) a rota recusaria o próprio painel. |
| Vídeo vinculado apagado se a limpeza do anterior falhasse (achado do Claude) | — | marcar o vínculo dentro do commit | **corrigido** | Evita produto com vídeo quebrado. |

## 9. Modelos do Codex usados

| Rodada | Tarefa | Modelo | Esforço |
| --- | --- | --- | --- |
| 1 | Revisão da arquitetura + plano de testes | `gpt-5.6-terra` | `medium` |
| 2 | Implementação (biblioteca, rota, actions, cliente, migration, testes) | `gpt-5.6-sol` | `high` (envolve Storage/RLS) |
| 3 | 8 correções da revisão do Claude | `gpt-5.6-terra` | `medium` |
| 4 | Endurecimento (binário sem permissão, log, orçamento no CI) | `gpt-5.6-terra` | `medium` |
| 5 | Validação dos resultados e revisão adversarial | `gpt-5.6-sol` | `medium` |
| 6 | Correção dos achados da revisão adversarial | `gpt-5.6-sol` | `medium` |

Não foi usado `gpt-6-astra`. Não foi preciso subir de degrau em nenhuma rodada. Cada rodada foi uma conversa nova do Codex: havia outros trabalhos do Codex rodando na mesma pasta e continuar "a última conversa" poderia retomar a conversa errada.

## 9.1 Validação final do Codex e o que foi feito com ela

Relatório: [video-compactacao-validacao-codex-resultados.md](video-compactacao-validacao-codex-resultados.md). O Codex reexecutou lint, typecheck e os testes na sandbox dele (26 arquivos, 118 testes, nas duas configurações de ambiente — antes das correções abaixo), conferiu as contas e **reprovou** a primeira versão por dois caminhos que "falhavam abertos". Resolução:

| Achado do Codex | Gravidade dele | O que foi feito |
| --- | --- | --- |
| Remover vídeo apagava o arquivo mesmo quando a consulta de referências falhava | Bloqueante | **Corrigido**: falha fechada (não apaga; a sobra fica para a faxina) e o registro só é considerado limpo com uma linha alterada. Código já existente antes desta entrega. |
| Limpeza de **fotos** tratava erro de consulta como "sem referência" | Bloqueante | **Corrigido**: qualquer erro nas três consultas impede a exclusão. Também era código anterior a esta entrega; entrou aqui por ser pequeno e por proteger mídia publicada. |
| Gravações não confirmavam que uma linha foi alterada | Importante | **Corrigido nos fluxos de vídeo** (rota e remoção). Nos fluxos de foto fica como melhoria futura: o risco ali não mudou com esta entrega. |
| Só o ffmpeg tinha prazo; download e upload não | Importante | **Corrigido**: prazo total de 170 s desde a entrada na rota, 60 s para baixar o bruto, 30 s para enviar a saída, reserva de 20 s para gravar e limpar; estouro → 504 com mensagem própria. |
| Saída pública órfã pode ficar para sempre se o produto nunca mais for tocado | Importante | **Divergência mantida** (limitação aceita): a janela é de milissegundos entre publicar e gravar, a sobra tem no máximo 4 MiB e nome imprevisível, e uma faxina global custaria uma listagem por produto a cada envio. Reavaliar se o painel ganhar uma tarefa agendada. |
| Leitura de metadados no navegador podia esperar para sempre | Importante | **Corrigido**: depois de 8 s o painel segue e o servidor decide. |
| Prévia da foto não é restaurada quando o envio da foto falha | Menor | Não alterado: comportamento anterior a esta entrega, fora do escopo. |
| Teste de corrida (A6) declarado mas ausente | Lacuna | **Corrigido**: dois processamentos intercalados do mesmo produto, nas duas ordens, com estado simulado. |
| B5 com caminho inexistente; lista do "não testado" incompleta; MB × MiB | Ressalvas | **Corrigido neste documento** (seções 3, 5, 10 e 11). |

Depois das correções: lint e typecheck sem erros, **28 arquivos e 134 testes** (com e sem os valores de ambiente do CI), build verde. A biblioteca de compactação não mudou nessa rodada, então as medições da seção 1 continuam valendo. As correções foram revisadas pelo Claude Code (diff completo) — o Codex implementou, o Claude validou.

## 10. O que NÃO foi testado

1. **Execução da rota dentro da Vercel** (V2) — o item mais importante em aberto.
2. **Fluxo completo pelo painel** com Supabase real (N1–N8, B8): envio assinado de arquivo grande, download pela rota, publicação, troca e remoção.
3. **Vídeo gravado por celular de verdade** (Android e iPhone). Todas as amostras são sintéticas.
4. **Fidelidade de cor do HDR de iPhone.** A cadeia roda e marca BT.709 (também no Linux), mas a amostra é um vídeo comum etiquetado como HLG; só um vídeo HDR real mostra se as cores ficam naturais.
5. **Seletor de arquivos do iPhone/Safari** (ele pode recomprimir o vídeo antes de entregar) e o do Android.
6. Envio em rede móvel lenta de um bruto de 30–50 MB (tempo e queda de conexão), e o envio real de um arquivo próximo de 50 MiB.
7. Leitura anônima de um bruto **existente** no bucket privado (B5 foi feito com caminho inexistente) e URL assinada expirada.
8. Rota protegida no preview da Vercel (V4) — só local e por teste automatizado.
9. Recodificação de segurança acionada por conteúdo real (só foi forçada com teto injetado; nas 8 amostras o teto do codificador bastou).
10. Duas compactações simultâneas do mesmo produto contra o Supabase real (coberto por teste automatizado com estado simulado, nas duas ordens).
11. Reenvio e remoção de **foto** pelo navegador depois desta mudança (o fluxo de fotos só mudou para falhar fechado na conferência de referências; coberto por teste automatizado).
12. Recuperação de uma saída pública órfã de um produto que nunca mais recebe ação — não existe faxina global (limitação aceita, seção 7).

## 11. Roteiro curto para fechar em stage (pessoa com login)

1. Abrir o preview do PR (ou o stage depois do merge na `develop`), entrar no painel, abrir um produto **com foto**.
2. Enviar um vídeo de celular de até 15 s. Esperado: percentual de envio, "Compactando o vídeo…", e a mensagem "Vídeo compactado e salvo: X MB → Y MB" com Y de no máximo 3,0 (3 MiB) para 15 s.
3. Abrir o produto no cardápio pelo celular em 4G: capa com botão de play; o vídeo começa em cerca de 1 s e toca mudo.
4. Repetir com um vídeo de iPhone (de preferência com HDR ligado) e conferir as cores.
5. Tentar um vídeo de mais de 15 s e um arquivo que não é vídeo: mensagem clara e o vídeo anterior continua no ar.
6. Se o passo 2 falhar: `vercel logs <url-do-deploy>` e procurar `[salgae] media_video_compression_failed` — o campo `detail` diz o motivo (binário não encontrado, sem permissão, ffmpeg terminou com código N, tempo esgotado).

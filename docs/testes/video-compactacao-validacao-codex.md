# Validação Codex — compactação de vídeo

Escopo desta revisão: arquitetura proposta e plano de testes do Claude. Não é uma implementação. A opção de servidor síncrona continua sendo a melhor escolha para o volume atual, desde que os ajustes abaixo sejam condições de aceite.

## Arquitetura e especificação

| Ponto | Parecer | Motivo técnico / ajuste necessário |
| --- | --- | --- |
| Escolha: ffmpeg em rota Node síncrona | **AJUSTAR** | É adequada ao baixo volume e evita depender do celular. Não é uma fila durável: timeout, encerramento da função ou aba fechada deixam trabalho interrompido. Declarar explicitamente que o resultado é atômico para o produto, mas o reenvio é necessário após interrupção; se o volume ou o tempo real excederem o limite medido na Vercel, migrar para worker/fila, não aumentar silenciosamente o timeout. |
| Upload bruto direto ao Storage | **APROVADO** | Evita o limite de corpo da função. O caminho precisa ser um *upload intent* persistido (id, produto, admin, criado em, estado), e não só UUID no path; a rota deve aceitar somente intent pendente, pertencente ao admin/produto e não expirado. |
| Bucket privado de bruto | **APROVADO** | Separar bruto de publicado é correto. Conferir no teste que URL pública, URL autenticada sem admin e URL assinada expirada não leem o objeto. A action deve criar URL assinada somente depois da autorização e limitar o caminho exato. |
| Assinatura + `-f mov`/`-f matroska` | **AJUSTAR** | Assinatura curta não prova arquivo íntegro. Validar `ftyp` e marcas ISO/QuickTime permitidas, e no EBML validar `DocType=webm`; abrir somente um arquivo temporário regular, com argv (nunca shell), `-nostdin`, `-protocol_whitelist file,pipe`, sem concat/protocolos de rede. `-f` reduz superfície, mas não substitui limite de CPU, memória, dimensões e tempo de `ffprobe`/`ffmpeg`. |
| Limites de recurso de entrada | **REPROVADO** | Faltam limites contra bomba de decodificação: timeout também no probe, `-threads 1`, teto de pixels por quadro, largura/altura razoáveis, número de streams e duração derivada dos timestamps. Rejeitar fluxo ausente, duração não finita/desconhecida e vídeo sem quadros; WebM pode não preencher `format.duration`. |
| Duração de 15,5 s | **AJUSTAR** | Medir `max(end_pts)` do fluxo de vídeo quando o contêiner não informar duração; não confiar só em `format.duration`. Explicar se a saída pode durar 15,5 s ou deve cortar em 15,0 s; hoje entrada tolera 15,5 e a saída aparenta preservar tudo. |
| H.264 High@3.1, yuv420p, 720p | **AJUSTAR** | Definir explicitamente `-c:v libx264 -profile:v high -level:v 3.1 -pix_fmt yuv420p`; 1280×720×30 fica exatamente no teto de macroblocos/s do nível 3.1. Validar no resultado perfil, level, pix_fmt, dimensão e ausência de display matrix. |
| CRF 24 + `maxrate` 1500k | **REPROVADO** | VBV limita pico, não garante média nem arquivo ≤3/4 MB; CRF pode ultrapassar o teto para conteúdo complexo. Após a primeira codificação, validar tamanho e tentar uma política determinística de reencode (CRF maior/bitrate calculado) ou retornar erro preservando o vídeo anterior. O teste deve ter amostra ruidosa que force esse caminho. |
| FPS e VFR | **AJUSTAR** | `-fpsmax 30` isolado não define a política de timestamps. Decidir entre preservar VFR abaixo de 30 ou normalizar com filtro `fps=30`; testar por PTS/contagem de frames, não só `avg_frame_rate`, que pode mentir em VFR. Fixar `-g 60 -keyint_min 60 -sc_threshold 0` somente se a saída for CFR de 30; caso contrário calcular GOP em tempo. |
| Rotação | **AJUSTAR** | O autorotate padrão e filtro manual podem aplicar rotação duas vezes. Escolher um único caminho: ler display matrix/rotate, usar `-noautorotate` e filtro explícito, zerar a rotação na saída; testar pixels/dimensões e metadado de rotação ausente, não só dimensões. |
| HDR HLG/PQ para SDR | **AJUSTAR** | `zscale`/`tonemap` dependem de filtros compilados no binário e HLG/PQ exigem cadeia e tags de entrada corretas. Detectar `color_transfer`, primaries e bit depth; converter apenas HDR conhecido, rejeitar ou registrar fallback seguro para tags contraditórias, e forçar/validar BT.709 8-bit na saída. Teste deve verificar os filtros disponíveis no binário Linux. |
| Áudio e metadados | **APROVADO** | `-an` e `-map_metadata -1` são adequados, mas usar mapeamento explícito de um único vídeo (`-map 0:v:0`) e negar anexos/data streams. Validar formato de saída, tags e todos os fluxos, não apenas o primeiro. |
| `faststart` | **AJUSTAR** | Validar o arquivo por parser de caixas MP4: `moov` inteiro antes de `mdat` (não exigir literalmente a ordem imediata `ftyp, moov, mdat`, pois caixas legítimas podem existir entre elas). Também abrir a saída com ffprobe. |
| Temporários e processos | **AJUSTAR** | Criar diretório único com `mkdtemp`, permissões restritas; remover em `finally`; matar processo e seus filhos no timeout; aguardar encerramento antes de apagar. Nunca registrar paths, argv completo, URI assinada ou bytes do vídeo. `/tmp` local não sobrevive à morte da função: faxina só cobre Storage. |
| Ordem publicar → banco → apagar anterior | **APROVADO** | Preserva o vídeo anterior se upload/DB falhar. Há janelas inevitáveis: após publicar e antes do DB sobra saída órfã; após DB e antes de apagar sobra anterior. A faxina deve ser idempotente e ambos são aceitáveis desde que nunca se apague o caminho atualmente referenciado. |
| Concorrência no mesmo produto | **REPROVADO** | Dois uploads podem concluir invertidos: o mais velho sobrescreve o novo e a faxina pode apagar saída ainda em uso. Serializar por produto (linha de intent/versão/lock transacional) e fazer update condicional no intent vigente; só o vencedor pode trocar `video_path`. |
| Faxina de órfãos em 30 min | **REPROVADO** | Faxina no início de novo envio pode apagar um bruto legítimo ainda carregando ou processando há >30 min. Marcar intent `uploading/processing`, renovar lease/heartbeat e excluir somente intent expirado que não esteja ativo; revalidar referências no momento da remoção. Listagem paginada e erro de listagem não podem ser tratados como lista vazia. |
| Falha da função em cada etapa | **AJUSTAR** | Documentar matriz: antes do bruto (nada); após bruto (bruto expira); durante encode (bruto+tmp, tmp morre com a função); após saída e antes do DB (saída órfã); após DB e antes da remoção antiga (antigo órfão); após remoção antiga (novo já referenciado). A recuperação não pode depender de o mesmo admin iniciar outro upload: usar job/cron administrativo ou rotina invocável autenticada. |
| Limites Supabase Storage | **AJUSTAR** | 50 MB deve ser 52.428.800 bytes e validado no cliente, action/intent e bucket; `file_size_limit` não substitui validação de Content-Length real. Confirmar que o plano e gateway aceitam upload assinado de 50 MB, que lista/remove paginam e que política permite à rota baixar/remover o bruto com a sessão usada. |
| Publicação exclusiva pela rota | **AJUSTAR** | A política proposta permite qualquer admin inserir MP4 direto em `product-videos`; então a afirmação de que “só a rota publica” é falsa. Preferir bucket de saída sem `insert` para sessão de usuário e usar credencial de servidor limitada, ou aceitar formalmente essa exceção e não tratá-la como garantia de compactação. |
| CSRF da Route Handler | **REPROVADO** | Cookie de sessão é enviado em requisição cross-site em cenários permitidos; admin não basta. Exigir método POST, `Origin` presente e igual a origem canônica configurada (incluindo preview), rejeitar `null`/ausente, conferir `Sec-Fetch-Site` quando disponível e não emitir CORS permissivo. Testar que a rota retorna JSON 403 antes de download/ffmpeg/Storage. |
| Empacotamento Next 16/Vercel | **AJUSTAR** | `serverExternalPackages` sozinho não copia executável; `outputFileTracingIncludes` precisa usar o pattern/chave exatos da rota e incluir binário Linux do pacote instalado em CI. Verificar no artefato/preview existência, modo executável e `ffmpeg -version`; manter `ffmpeg-static` em `dependencies` com versão travada e não depender do binário Windows local. |
| 250 MB, 300 s e 1 vCPU | **AJUSTAR** | Tratar como hipótese de deploy, não contrato permanente: plano/limites podem variar por plano e região. Declarar `runtime='nodejs'`, `maxDuration` compatível com o projeto e medir no preview com upload real; não expor rota diagnóstica pública. |
| Cliente e player atuais | **AJUSTAR** | Hoje aceitam apenas MP4/WebM e 10 MB, confirmam upload sem compactar e anunciam esses limites. A mudança precisa aceitar MOV/50 MB, mostrar “compactando”, impedir clique duplicado, preservar a capa e trocar `video_path` somente após sucesso. `preload="none"` é correto, mas teste de rede deve considerar que controles/autoplay podem variar por navegador. |

### Decisão

**APROVADA COM AJUSTES BLOQUEANTES.** Eu manteria ffmpeg no servidor para esta fase. Não escolheria browser/híbrido. Trocaría para fila/worker somente se a medição real do preview não couber com margem confortável ou se houver uploads concorrentes/volume que justifiquem processamento assíncrono; uma fila sem resolver intents, idempotência e faxina apenas deslocaria os mesmos bugs.

## Validação item a item do plano do Claude

| Item | Parecer | Ajuste exato / lacuna |
| --- | --- | --- |
| E1 | **AJUSTAR** | Separar teto absoluto de 4 MiB do alvo 3 MiB; não exigir “220 KB/s” para clipes curtos (overhead domina). Incluir vídeo ruidoso que acione reencode e comprovar a política. |
| E2 | **AJUSTAR** | Verificar todos os streams, `profile=High`, `level<=31`, `pix_fmt=yuv420p`, uma só faixa de vídeo e display rotation zerada. |
| E3 | **AJUSTAR** | Parser de boxes deve provar `moov` antes de `mdat`, sem supor que são as três primeiras boxes. |
| E4 | **AJUSTAR** | A6 já é 720p e não prova limite; adicionar WebM 1920×1080. Para A3, provar rotação por padrão visual/display matrix, não somente W×H. |
| E5 | **AJUSTAR** | Medir PTS/contagem/duração para VFR; `fps` nominal ≤30 passaria mesmo se timestamps/frame pacing estiverem errados. |
| E6 | **AJUSTAR** | Para normalização a 30, permitir tolerância ligada a um frame e assegurar que nunca excede a política de 15/15,5 s. |
| E7 | **AJUSTAR** | Gerar a referência com a mesma cadeia geométrica e timestamps; SSIM global pode esconder quadros ruins. Para HDR, verificar tags BT.709, 8-bit e uma métrica/inspeção de luminância, não só screenshot registrado. |
| E8 | **APROVADO** | Incluir também rotação, `creation_time`, handler/name e qualquer tag de formato/stream; a pré-condição deve comprovar que A1/A3 carregam essas tags. |
| E9 | **AJUSTAR** | `60 s` é alerta insuficiente: falhar acima do orçamento definido com margem para `maxDuration`, incluindo probe/download/upload; registrar CPU/RSS quando disponível. |
| E10 | **AJUSTAR** | Acrescentar duração ausente WebM, stream de dados/anexo, dimensão extrema e arquivo que excede timeout; provar que ffmpeg não tentou rede. |
| E11 | **AJUSTAR** | Rodar em diretório temporário único por caso e testar timeout/abort, não só erro de validação. |
| B1 | **APROVADO** | Conferir números em bytes e mime exatos, inclusive que bucket novo é privado. |
| B2 | **AJUSTAR** | Além de SQL, testar endpoint Storage real e URL assinada expirada; `select=0` não prova que GET seja negado. |
| B3 | **APROVADO** | Usar JWT/usuário realmente não-admin, não apenas simulação de role. |
| B4 | **AJUSTAR** | Cobrir URL assinada de upload e delete/list do admin; limpar objeto no mesmo rollback. |
| B5 | **APROVADO** | Testar um path existente de teste; path inexistente não prova privacidade. |
| B6 | **APROVADO** | Conferir também ordem e migração aplicada uma única vez. |
| B7 | **AJUSTAR** | Advisors sem aviso é sinal fraco; registrar política efetiva e teste positivo/negativo de cada operação. |
| B8 | **AJUSTAR** | Paginar listagem, separar objetos de outros testes e testar órfão após falha de DB/interrupção simulada. |
| N1 | **AJUSTAR** | Não prometer tamanho final se API não o retorna; checar botão desabilitado/reentrada, MOV no `accept`, 50 MB e mensagens coerentes. |
| N2 | **AJUSTAR** | Provar que `video_path` só muda depois de saída validada; cache longo é header observável, não só metadata. |
| N3 | **AJUSTAR** | “Primeiro pedido Range contém moov” é dependente do CDN/browser e pode passar/falhar sem provar faststart. Manter parser E3 como prova e usar N3 apenas para ausência de download antes do toque e reprodução. |
| N4 | **AJUSTAR** | Executar em Safari/iPhone real quando disponível; upload de arquivo MOV no desktop não prova suporte do seletor/câmera do iOS. |
| N5 | **AJUSTAR** | Inserir duas submissões concorrentes/uma lenta e garantir que a mais recente vence; sequência simples não testa corrida. |
| N6 | **AJUSTAR** | X4 deve ser rejeitado antes de URL assinada e a rota deve rejeitar bruto oversized também; incluir duração ausente/corrompido após upload. |
| N7 | **APROVADO** | Conferir remoção idempotente e referência compartilhada, se o modelo ainda permitir compartilhamento. |
| N8 | **APROVADO** | Confirmar tanto interface quanto action/rota para impedir bypass. |
| V1 | **AJUSTAR** | Build verde/tamanho não prova binário copiado nem executável; executar `ffmpeg -version` na própria função. |
| V2 | **REPROVADO** | Rota diagnóstica que gera mídia pesada amplia superfície e pode vazar em preview. Usar a rota real autenticada com amostra controlada no Storage stage, ou invocação interna protegida sem endpoint público; medir download+encode+upload e cleanup. |
| V3 | **APROVADO** | Além de grep, conferir manifest/rotas do build final. |
| V4 | **AJUSTAR** | Cobrir sem sessão, usuário comum, Origin ausente, Origin inválido e replay de path/intent; afirmar nenhum download/ffmpeg/alteração. |
| R1 | **AJUSTAR** | Rodar `npm ci` em Ubuntu limpo antes; testes de ffmpeg não podem depender de binário global, GPU ou rede. |
| R2 | **APROVADO** | Manter como regressão obrigatória. |
| R3 | **AJUSTAR** | Verificar também rota nova: métodos inválidos, OPTIONS/CORS e resposta JSON sem vazar detalhes. |
| R4 | **AJUSTAR** | CI verde prova Linux apenas se os novos testes reais forem obrigatórios e não `skip` por ausência de ffmpeg-static. |


# Plano Codex — testes automatizados de compactação de vídeo

Escopo da próxima rodada: Vitest em `node`, sem rede além do `npm ci`, executado no Ubuntu do CI. Vídeos são gerados durante o teste com o binário Linux de `ffmpeg-static` e ficam em diretório temporário único. Testes que dependem de Storage real/Vercel permanecem no roteiro externo; aqui usamos fakes fiéis para actions/rota.

## Premissas de teste

- `ffmpeg-static` e o leitor/probe usado pela implementação serão dependências de produção, com versão travada. Se o binário não existir/executar, a suíte **falha**, nunca usa `skip`.
- Helpers internos terão injeção de diretório temporário, relógio, executor de processo e cliente Supabase para permitir erro, timeout e ordem de chamadas determinísticos.
- Amostras lavfi serão curtas (normalmente 2–4 s, 360p/540p); um único caso 720p/60 fps. Os limites de produção serão exercitados por metadados/fixtures controladas, sem gerar 50 MB repetidamente.

## Casos unitários e de integração locais

| # | Objetivo | Entrada / passos | Esperado | Por que comprova a ideia | Como falharia se o código estivesse errado |
| --- | --- | --- | --- | --- | --- |
| U1 | Construir argv seguro | MP4, MOV e WebM válidos; paths com espaço; opções de saída | argv é array, sem shell; `-nostdin`, formato forçado permitido, um `-i` local, map de `0:v:0`, `-an`, x264/High/3.1/yuv420p, faststart, threads, GOP e metadata definidos | Prova que o processo recebe a política completa, sem interpolação de entrada | Um path malicioso vira opção/comando, áudio permanece ou flags críticas somem |
| U2 | Restringir protocolos e streams | Inspecionar argv de probe/encode com entrada hostil | whitelist `file,pipe`; sem concat/http; limite de streams e filtros controlados | A assinatura não é a única barreira contra demuxer hostil | Um arquivo poderia induzir abertura de URL/arquivo auxiliar |
| U3 | Detectar tipo real | Buffers: ISO MP4/MOV válidos com `ftyp`, EBML+DocType WebM, texto, EBML Matroska, ftyp truncado/desconhecido | Só MP4/MOV/WebM previstos retornam tipo/demuxer; demais retornam erro tipado | MIME/extensão não são autoridade | Texto renomeado ou MKV passa para ffmpeg |
| U4 | Validar tamanho e intent | MIME falso, tamanho 0, 50 MiB+1, path fora do produto, intent expirado/de outro admin/já consumido | Rejeição antes de URL/Storage/processo | Protege a borda antes de custo de processamento | Action cria URL para atacante ou path replayado |
| U5 | Extrair metadados robustamente | Respostas de probe: duração de format, duração apenas por PTS, WebM sem duração, sem vídeo, duração 15,5/15,5001, dimensão extrema | Duração correta/finita; fronteira documentada; ausência/stream inválido rejeitado | Prova a regra para WebM e dados reais de ffprobe | WebM desconhecido é aceito ou vídeo longo passa |
| U6 | Ler rotação e HDR | Metadados de `rotate`/display matrix 90/270, SDR, HLG, PQ, tags contraditórias | Filtro/decisão corretos; HDR conhecido vira cadeia tone-map; ambíguo é erro ou fallback documentado | A política depende de streams, não de extensão | Vídeo sai deitado, dupla rotação ou HDR lavado sem detecção |
| U7 | Calcular dimensões | Paisagem/retrato 4K, 1080p, 640×360, ímpar e após rotação | Encaixa em 1280×720 ou 720×1280, não amplia, lados pares e razão preservada | Prova matemática independente do ffmpeg | Escala além do original ou gera dimensão ímpar incompatível |
| U8 | Política FPS/GOP | Metadados CFR 24/30/60 e VFR; duração curta | Estratégia explicitada retorna fps/PTS/GOP coerentes; 60 reduz a 30 | Evita “fps nominal” enganoso | Saída declara 30 mas duplica/perde quadros incorretamente |
| U9 | Política de tamanho | Resultado simulado abaixo/acima de 3/4 MiB e referência ruidosa | Aceita alvo, ativa reencode determinístico quando necessário e rejeita acima de 4 MiB | CRF+VBV não é teto de arquivo | Publica arquivo >4 MiB ou falha sem tentar a política prevista |
| U10 | Parser MP4 faststart | MP4s mínimos/fixtures com `moov` antes/depois de `mdat` e caixas intermediárias | Aceita apenas `moov` completo antes de `mdat` | Não depende de ordem rígida ou de texto do ffprobe | `moov` no fim passa ou MP4 válido com `free` falha |
| U11 | Timeout e árvore de processo | Executor fake que não encerra; AbortSignal/relógio controlado | Erro `video_timeout`, kill é chamado, aguarda término e cleanup ocorre | Prova que timeout não deixa encode concorrente | Processo continua gravando depois do retorno |
| U12 | Limpeza local | Sucesso, probe inválido, encode falho, timeout e erro de upload; `mkdtemp` injetado | Diretório do caso é removido; nenhum arquivo fora dele é tocado | `finally` é exercitado em todos os ramos | `.mp4`/bruto temporário sobra após exceção |
| I1 | Compactação real SDR | Gerar com lavfi vídeo 540p/30 com áudio e padrão com detalhe; compactar | ffprobe: H.264 High, level ≤3.1, yuv420p, um vídeo, sem áudio; abre normalmente | Exercita binário, filtros e validação final | x264/filtro ausente, áudio/codec errado |
| I2 | Dimensão e não ampliação reais | Gerar 1920×1080, 1080×1920 e 640×360 | 1280×720, 720×1280 e 640×360; pares | Confirma que cálculo chegou ao filtro certo | Paisagem/retrato trocados ou pequeno ampliado |
| I3 | 60 fps e VFR reais | Gerar 540p/60; gerar VFR por timestamps conhecidos | Saída respeita ≤30; contagem/PTS e duração obedecem política | Mede o arquivo, não só argv | `-fpsmax` não produz o que se acredita |
| I4 | Átomos e metadados reais | Entrada com `creation_time`/tags e áudio; compactar e parsear bytes | `moov` antes de `mdat`; tags sensíveis ausentes; sem áudio | Prova faststart e privacidade no produto final | Flags estão presentes mas em posição errada/ineficazes |
| I5 | Qualidade objetiva | Entrada lavfi com movimento/detalhe; referência lossless pela mesma geometria/timestamps; comparar via filtro SSIM | SSIM médio ≥0,95 em plataforma Linux | Detecta regressão visível do encode | CRF/filtro muda e ainda passa em testes só estruturais |
| I6 | Tamanho real | Amostra curta com ruído e conteúdo simples | Saída ≤ teto proporcional e ≤4 MiB; teste força caminho de reencode quando configurado | Mede a promessa de leveza | Conteúdo complexo estoura mesmo com `maxrate` |
| I7 | Rotação real | Gerar MOV/MP4 com display rotation e padrão assimétrico | Pixels/dimensões na orientação esperada; saída sem rotação metadata | Evita falso positivo apenas por W×H | Autorotate duplica ou metadado restante mascara erro |
| I8 | HDR real, condicionado ao binário | Gerar 10-bit HLG/PQ somente se o próprio ffmpeg-static anunciar filtros/encoder necessários; caso não suporte, assertar erro explícito suportado | Saída SDR BT.709, 8-bit, ou erro claro antes de publicar | Não mascara incapacidade do pacote | HDR é processado como SDR sem tone mapping |
| I9 | Rejeições reais | Texto, MP4 truncado, vídeo de duração acima do limite e WebM sem duração | Erro tipado; ffmpeg não publica; tmp vazio | Exercita parser+probe reais | Corrompido chega ao encode/publicação |
| A1 | Action cria upload com segurança | Supabase fake; admin, não-admin, sem capa, MOV e path intent | Admin com capa recebe URL/payload correto; demais não chamam Storage | Mantém autorização existente e nova política MOV | URL criada sem admin/capa |
| A2 | Rota bloqueia antes de processar | Request sem sessão, usuário comum, Origin ausente/nulo/estranho, método errado, intent de outro produto | 401/403/405 JSON; zero download, ffmpeg, DB ou remoção | Prova CSRF+autorização na fronteira | Cookie cross-site dispara processamento |
| A3 | Fluxo seguro de sucesso | Fakes registram upload de saída, update de produto, remoção anterior/bruto, audit/revalidate | Ordem: baixar/validar/compactar/verificar → enviar saída → gravar `video_path` condicional → remover anterior se não referenciado → remover bruto; resposta sucesso | Prova que nunca há janela sem vídeo atual | Anterior apagado antes do commit ou bruto fica |
| A4 | Rollback de DB | Upload saída funciona; update falha | Remove saída nova e bruto; não remove anterior; erro seguro | Preserva estado publicado | Produto aponta para nada ou novo órfão eterno |
| A5 | Falhas por etapa | Fakes falham em download, probe, encode, verificação, upload, audit e remoções | Produto só muda após commit; bruto sempre recebe tentativa de remoção; falha de limpeza é registrada sem mascarar estado | Exercita matriz de falhas | Um ramo deixa bruto ou remove anterior |
| A6 | Corrida e idempotência | Dois intents do mesmo produto, primeiro lento e segundo vencedor; executar/finalizar repetido | Só intent vigente grava; perdedor não apaga saída atual; segunda chamada não duplica efeitos | Testa o furo principal de concorrência | Upload velho sobrescreve novo ou faxina apaga vencedor |
| A7 | Faxina segura | Lista paginada com intents: expirado, uploading/processando com lease vivo, referenciado, saída órfã e erro de listagem | Remove somente expirado/não referenciado; nunca assume lista vazia em erro; usa paginação | Prova que limpeza não destrói envio em curso | Objeto ativo/atual é apagado |
| A8 | Cliente | Validadores puros/DOM mockado: MOV, 50 MiB, duração legível/ilegível, 15,5 s, envio duplicado | Mensagens e limites novos; metadado indisponível deixa servidor decidir; UI não inicia duas operações | Cliente melhora UX sem virar autoridade | MOV é barrado ou HEVC sem metadata impede upload legítimo |

## Tempo e estabilidade no CI

Estimativa: **35–70 s** adicionais em `ubuntu-latest`, com `--threads=false`/pool sequencial para os testes que invocam ffmpeg; o restante pode rodar em paralelo. O caso HDR pode elevar para cerca de 90 s se o binário o suportar.

- Gerar mídia determinística com `lavfi` (sementes e duração explícitas), sem câmera, GPU, rede, hora real ou binário do sistema.
- Usar resolução/duração mínimas que preservem a propriedade medida; reservar 720p/60 para um caso único.
- Timeout generoso por caso no CI, mas timeout interno controlado por fake nos testes de cancelamento; não testar performance por milissegundos.
- Comparar métricas com tolerância documentada (SSIM) e estrutura exata (codec/átomos/dimensões); guardar stderr somente em falha.
- Isolar cada teste em `mkdtemp`, limitar concorrência do ffmpeg a uma execução e limpar em `afterEach` como rede de segurança.

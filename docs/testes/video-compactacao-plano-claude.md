# Compactação de vídeo — plano de testes do Claude Code (para validação do Codex)

Protocolo: [testes cruzados](../../Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/11-Agentes-de-IA.md). Arquitetura e limiares: [video-compactacao-plano.md](video-compactacao-plano.md). Estes testes são executados pelo Claude Code: banco de **stage** (`csirmtmerqpbhatruzaf`), vídeos de verdade na máquina de desenvolvimento, navegador e deploy de preview do PR no projeto Vercel `salgae-homologacao`. Nada em produção.

Amostras (geradas com ffmpeg fora do repositório, com bitrates de celular e faixa de áudio; as de retrato/iPhone levam também uma etiqueta de localização GPS falsa para provar a remoção de metadados):

| Id | Arquivo | Para quê |
| --- | --- | --- |
| A1 | retrato 1080×1920, H.264, 30 fps, 12 s, ~17 Mbit/s, MP4 | caso típico Android |
| A2 | paisagem 1920×1080, H.264, 30 fps, 15 s, MP4 | caso típico, duração máxima |
| A3 | `.mov` HEVC 1920×1080 com rotação 90° (retrato), 10 s | caso típico iPhone |
| A4 | `.mov` HEVC 10 bits HLG BT.2020 (HDR), 10 s | iPhone com HDR ligado |
| A5 | 1080p **60 fps**, H.264, 10 s | limite de quadros |
| A6 | WebM VP9 720p, 8 s | formato alternativo |
| A7 | pequeno 640×360, 8 s | não ampliar |
| A8 | 4K 30 fps, 10 s, ~44 MB | pior caso de tempo dentro dos 50 MB |
| X1 | texto renomeado para `.mp4` | tipo real |
| X2 | pedaço do meio de um MP4 (sem cabeçalho) | arquivo corrompido |
| X3 | 720p de 20 s | duração |
| X4 | arquivo acima de 50 MB | tamanho |

## Ponta a ponta com vídeos de verdade (código real do projeto, sem mock)

Um script fora do repositório importa a função de compactação do projeto e a executa sobre cada amostra, com o ffmpeg limitado a 1 thread para aproximar a Vercel.

| # | Objetivo | Medição | Esperado (reprova se não bater) |
| --- | --- | --- | --- |
| E1 | Peso | bytes antes/depois de A1–A8 | saída ≤ 3 MB (15 s) e sempre ≤ 4 MB; proporcional para durações menores (≤ 220 KB/s) |
| E2 | Formato compatível | fluxos da saída lidos pelo ffmpeg | exatamente 1 fluxo: vídeo `h264` High, `yuv420p`, nível ≤ 3.1; **nenhum** fluxo de áudio |
| E3 | Início rápido | leitura dos átomos do MP4 | `ftyp`, depois `moov`, depois `mdat` (moov antes de mdat) |
| E4 | Resolução e orientação | largura×altura | A1, A3 → 720×1280 (A3 prova a rotação); A2, A4, A5, A8 → 1280×720; A6 → 1280×720; A7 → 640×360 (sem ampliar) |
| E5 | Quadros | fps da saída | ≤ 30 em todas; A5 (60 fps) → 30 |
| E6 | Duração preservada | duração antes/depois | diferença ≤ 0,1 s |
| E7 | Qualidade | SSIM e PSNR contra uma referência **sem perdas** (`-qp 0`) gerada com o mesmo redimensionamento e a mesma seleção de quadros | SSIM ≥ 0,95 em A1–A3 e A5–A8. A4 (HDR): sem métrica contra o original (a conversão de cor é intencional); conferir que a saída está marcada/convertida como BT.709 8 bits e registrar quadro de amostra |
| E8 | Privacidade | metadados da saída | sem etiqueta de localização, sem data de criação, sem nome do aparelho |
| E9 | Tempo | segundos por amostra com 1 thread | registrar; alerta se alguma passar de 60 s (o teto real é medido em V2) |
| E10 | Rejeições | X1, X2, X3 pela função; X4 pelo validador de tamanho | erro tipado correto para cada um; **nenhum** arquivo temporário sobra no diretório de trabalho |
| E11 | Limpeza | listar o diretório temporário usado antes/depois de E1–E10 | zero arquivos residuais, inclusive após erro |

## Banco e Storage (stage, SQL simulando papéis, com rollback)

| # | Objetivo | Passos | Esperado |
| --- | --- | --- | --- |
| B1 | Buckets certos | ler `storage.buckets` | `product-video-uploads`: **privado**, 52.428.800 bytes, `video/mp4`, `video/quicktime`, `video/webm`; `product-videos`: público, 4.194.304 bytes, só `video/mp4`; buckets de imagem inalterados |
| B2 | Visitante não toca no bruto | como `anon`: `insert` e `select` em `storage.objects` do bucket novo | `insert` bloqueado (42501); `select` devolve 0 |
| B3 | Usuário comum não toca no bruto | como `authenticated` sem perfil admin | idem |
| B4 | Admin grava e lê | como admin ativo: `insert` de objeto de teste e `select` (rollback) | permitido, 1 linha |
| B5 | Bruto não é público | `GET /storage/v1/object/public/product-video-uploads/qualquer` sem login | 400/404 (bucket não público), nunca 200 |
| B6 | Migration rastreável | `list_migrations` em stage | versão registrada = prefixo do nome do arquivo em `supabase/migrations/` |
| B7 | Advisors | `get_advisors` (security) | nenhum aviso novo |
| B8 | Sem órfãos | após os testes de navegador, listar os dois buckets de vídeo | `product-video-uploads` vazio; em `product-videos` só o `video_path` atual do produto de teste (e nada depois de remover o vídeo) |

## Navegador — painel e cardápio (build de produção local em `next start`, apontando para stage)

Condição: exige sessão de administrador de stage já aberta no navegador de teste. O Claude Code não digita senhas nem cria contas; se não houver sessão, estes itens ficam **não executados** e isso vai escrito no relatório.

| # | Objetivo | Passos | Esperado |
| --- | --- | --- | --- |
| N1 | Envio feliz no celular (375×812) | produto de teste com foto; escolher A1 | percentual de envio, depois "Compactando…"; sucesso informando o tamanho final; prévia toca no painel |
| N2 | Resultado publicado | banco + Storage após N1 | `video_path` termina em `.mp4` dentro de `products/<id>/`; objeto ≤ 3 MB, `video/mp4`, cache longo; bruto apagado |
| N3 | Cliente vê leve | `/produto/<id>` a 375 px, aba de rede | capa + botão de play; **nenhum** byte de vídeo antes do toque; após o toque o vídeo toca mudo e o primeiro pedido já traz o `moov` (pedido `Range` dos primeiros 64 KB contém `moov`) |
| N4 | iPhone | escolher A3 (`.mov`) | aceito; saída em retrato 720×1280 |
| N5 | Troca segura | enviar A2 no mesmo produto | cardápio mostra o novo; o arquivo anterior some do Storage |
| N6 | Rejeições | X1, X3, X4 | mensagens do plano §3.4; `video_path` inalterado (o vídeo de N5 continua tocando); nada sobra nos buckets |
| N7 | Remoção | remover o vídeo | `video_path` nulo; objeto apagado; detalhe volta a mostrar só a foto |
| N8 | Sem foto de capa | produto sem foto | envio de vídeo indisponível/recusado com mensagem clara |

## Vercel — deploy de preview do PR (`salgae-homologacao`)

| # | Objetivo | Passos | Esperado |
| --- | --- | --- | --- |
| V1 | Binário no pacote | log do build do preview / tamanho da função da rota | build verde; função da rota de compactação < 250 MB |
| V2 | ffmpeg roda na Vercel, no tempo | rota de diagnóstico **temporária** (só existe em um commit intermediário da branch, responde apenas quando `VERCEL_ENV=preview`, não lê nem grava dados): gera em `/tmp` um 1080p/30 fps de 15 s, um HEVC com rotação e um HDR, e chama a mesma função de compactação da rota real; devolve versão do ffmpeg, tempos, tamanhos e a ordem dos átomos | compactação concluída; tempo de cada caso bem abaixo do `maxDuration` da rota (meta: ≤ 60 s para 1080p/15 s); saída válida (E2/E3). Se o preview exigir login da Vercel e não houver acesso, registrar como **não provado** |
| V3 | Diagnóstico removido | `git grep` na ponta da branch | a rota de diagnóstico não existe no commit final do PR |
| V4 | Rota real protegida | `POST` sem sessão na rota de compactação do preview | 401/403 em JSON; nenhum processamento |

## Regressão

| # | Objetivo | Esperado |
| --- | --- | --- |
| R1 | `npm run lint`, `npm run typecheck`, `npm test` (com e sem os placeholders de ambiente do CI), `npm run build` | tudo verde |
| R2 | Fotos | testes do Épico 4 continuam passando sem alteração de comportamento |
| R3 | Rotas públicas no build local | `/`, `/cardapio`, `/produto/<id>`, `/busca`, `/info` → 200; `/admin` sem sessão → redireciona ao login |
| R4 | CI do PR | verde no GitHub Actions (prova também o binário Linux do `ffmpeg-static` nos testes do Codex) |

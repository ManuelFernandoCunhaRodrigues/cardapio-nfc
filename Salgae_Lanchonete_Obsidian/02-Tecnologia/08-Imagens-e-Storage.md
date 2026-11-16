---
titulo: "Imagens, vídeos e Storage"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-11-16
---
# Imagens, vídeos e Storage

Voltar: [[00-Comece-Aqui]] · Relacionado: [[05-Painel-Administrativo]]

## Objetivo

Fotos e vídeos tornam o cardápio mais atrativo, mas podem deixar a página lenta, consumir cota de tráfego e gerar arquivos órfãos. Esta política equilibra aparência, desempenho e custo.

## Regras de envio

- Aceitar JPEG, PNG, WebP (e HEIC quando o navegador converter); **armazenar sempre em WebP**, conforme a seção de compressão abaixo.
- Quem processa foto e vídeo é a **API** (`apps/api/src/modules/media/`), com o administrador conferido. O site não fala com o Storage.
- Validar tipo real do arquivo, tamanho máximo e dimensões antes de disponibilizar.
- Gerar ou solicitar imagens otimizadas para exibição em celular.
- Usar nomes de arquivo não previsíveis, organizados por ambiente e tipo de recurso.
- Não confiar apenas na extensão enviada pelo navegador.

## Compressão e conversão para WebP (obrigatório)

Toda imagem enviada pelo painel é comprimida e convertida para **WebP** antes de ir para o Storage. O objetivo é deixar o arquivo leve **sem perda visível de qualidade**, tanto na prévia do painel quanto no cardápio do cliente.

### Algoritmo

1. **No navegador (inclusive no celular):** a foto escolhida (galeria ou câmera) é lida com a orientação EXIF aplicada e reduzida para no máximo **2048 px** no maior lado, exportada como JPEG de alta qualidade (0,92). Isso deixa o envio rápido em rede móvel e funciona em todos os navegadores (o Safari não gera WebP pelo canvas). Imagens menores nunca são ampliadas.
2. **Na API (com admin verificado):** o envio tem até 4 MB (a foto já reduzida). O arquivo é validado pelo **tipo real** (leitura do conteúdo com `sharp`, não pela extensão), girado conforme o EXIF, tem os **metadados removidos** (localização do celular etc.) e é convertido em **duas variantes WebP**:

| Variante | Maior lado | Meta de tamanho | Uso |
| --- | --- | --- | --- |
| `detail` | 1600 px | até ~300 KB | detalhe do produto e destaques |
| `card` | 640 px | até ~80 KB | cards, círculo das categorias e miniaturas do painel |

As fotos de categoria ficam no bucket `product-images`, na subpasta `categories/<id>/`. Trocar, remover ou excluir a categoria apaga o arquivo antigo, se nenhum outro registro o usa.

3. **Qualidade adaptativa:** começa em qualidade **82** (`effort` 5, `smartSubsample`). Se passar da meta, reduz de 6 em 6 até o **mínimo de 70** — nunca abaixo disso, para não aparecerem borrões ou blocos. Se mesmo em 70 passar da meta, mantém 70 (qualidade vence tamanho). O limite rígido é o do bucket, **1 MB** por arquivo: se a variante passar disso, a dimensão cai para 80% (até duas vezes); se ainda não couber, a API responde 413 com mensagem em português.
4. **Armazenamento:** as duas variantes vão para o bucket da foto (`product-images` para produtos e categorias, `highlight-images` para destaques) com nome não previsível (UUID); o banco guarda só a base do caminho e a interface escolhe a variante (`srcset`).
5. **Rejeições claras:** arquivo que não é imagem, imagem corrompida, menor que 400 px no menor lado, maior que 15 MB antes da redução ou acima de 40 megapixels. HEIC com HEVC (o padrão do iPhone) que chegue direto à API é recusado com mensagem clara, porque o `sharp` não decodifica esse formato; pelo painel, o navegador converte a foto para JPEG antes de enviar quando consegue abri-la.

> Os números (2048/1600/640 px, metas e qualidade 82→70) são o ponto de partida; ajustar depois de ver fotos reais em celular.

## Substituição de imagem

1. Enviar e validar a nova imagem.
2. Atualizar o registro do produto/destaque para apontar para a nova imagem.
3. Confirmar que nenhum outro registro usa o caminho antigo.
4. Somente então apagar o arquivo antigo.

Se a atualização falhar, a imagem antiga deve continuar disponível. A operação não pode deixar o produto sem foto por exclusão antecipada.

Desde 2026-11-15 (PR #92), o passo 2 é condicional: só grava se o registro ainda aponta para a foto lida no começo. Em dois envios ao mesmo tempo, quem perde apaga o que subiu e o painel pede para recarregar. Se o tempo limite de 15 s da API estourar, o envio é cancelado antes do vínculo. Desde o PR #94, uma regra única (`remove-media-if-unused.ts`) decide o apagamento de foto e de vídeo, na troca e na exclusão.

## Exclusão de produto

Antes de excluir um produto, decidir se a regra será desativar (recomendado para operação) ou excluir definitivamente. Caso haja exclusão definitiva, verificar referências e apagar a imagem somente quando ela não for mais usada.

## Exibição pública

Use imagens com tamanho responsivo, carregamento adiado para itens fora da tela e dimensão reservada para evitar que a página "pule" durante o carregamento. Deve haver uma imagem de fallback ou estado visual aceitável para arquivos indisponíveis.

## Vídeos de produto

Cada produto pode ter **um** vídeo curto e opcional. A foto continua obrigatória quando houver vídeo, porque ela é a capa (poster) e o fallback.

### Compactação automática (obrigatório)

Regra do responsável (2026-10-10): **o vídeo deve ficar sempre leve, para o cliente conseguir ver com facilidade, e com boa qualidade.** Por isso todo vídeo enviado pelo painel é compactado **no servidor** antes de ir para o cardápio. Quem cadastra pode gravar com o celular que tiver; o cliente recebe sempre o mesmo padrão. Decisão registrada em [[03-Decisoes-do-Projeto]].

### O que o painel aceita

| Item | Limite |
| --- | --- |
| Formato | MP4, MOV (iPhone) ou WebM |
| Duração | até 15 segundos (tolerância de meio segundo) |
| Tamanho | até 50 MB — um vídeo Full HD de 15 s pesa de 25 a 35 MB; 4K não cabe, gravar em Full HD |
| Capa | o produto precisa ter foto antes do vídeo |

### O que o cliente recebe

| Item | Padrão |
| --- | --- |
| Formato | MP4 H.264, compatível com qualquer celular (iPhone incluído) |
| Tamanho | até cerca de 3 MB para 15 s (normalmente 1 a 2,5 MB); nunca mais que 4 MB |
| Resolução | cabe em 1280×720 (deitado) ou 720×1280 (em pé); vídeo pequeno não é ampliado |
| Quadros | no máximo 30 por segundo |
| Áudio | removido; o vídeo toca sem som |
| Início rápido | o arquivo é organizado para começar a tocar antes de terminar de baixar |
| Privacidade | localização e dados do aparelho gravados pelo celular são removidos |
| Cores | vídeo HDR de iPhone é convertido para o padrão comum, para não ficar lavado |

A qualidade é conferida por medição: a saída precisa manter similaridade (SSIM) de pelo menos 0,95 em relação ao original reduzido ao mesmo tamanho. Os números medidos estão em `docs/testes/video-compactacao-resultados.md`.

### Como funciona

1. O painel confere tipo, tamanho e duração na hora da escolha e envia o vídeo original para um bucket **privado** (`product-video-uploads`, até 50 MB), por URL assinada, com barra de progresso.
2. A **API** (`apps/api/src/modules/media/video/`) confere o tipo real do arquivo, compacta com `ffmpeg`, confere o resultado e publica em `product-videos` (até 4 MB, só MP4). Desde 2026-11-15 (PR #94) esse trabalho é da API. A rota `/admin/midia/video` do Next só repassa o pedido, porque precisa de uma função de até 180 s com o binário do `ffmpeg`; pelo endereço `/api`, o processamento responde 501. Os limites ficam em `packages/core/src/rules/video-limits.ts`.
3. Só depois disso o produto passa a apontar para o vídeo novo; o anterior é apagado em seguida (mesma ordem segura das imagens).
4. O original e os arquivos temporários são apagados sempre, tenha dado certo ou não.

Se o arquivo não for um vídeo, passar de 15 s, ou a compactação falhar ou demorar demais, o painel mostra uma mensagem clara e o produto continua exatamente como estava — nunca fica com vídeo quebrado. Sobras de um envio interrompido (aba fechada, queda de conexão) são apagadas automaticamente no envio seguinte, depois de 30 minutos.

### Vídeos já publicados

Não precisam ser refeitos: continuam tocando. Para deixá-los leves, basta enviar o vídeo de novo pelo painel.

### Exibição e custo

- Carregar o vídeo apenas no detalhe do produto e só quando o cliente toca no botão de play (`preload="none"`), nunca na listagem.
- Servir com cache longo (arquivo novo = caminho novo) para reduzir tráfego repetido.
- Com vídeos de até 3 MB, os 5 GB mensais de tráfego do plano Free do Supabase comportam mais de 1.600 reproduções completas por mês. Acompanhar o uso; se o cardápio crescer muito, avaliar o plano Pro ou um serviço de vídeo dedicado.
- A compactação roda na API, dentro da função da Vercel do próprio site. No servidor próprio, o mesmo código usa o `ffmpeg` do pacote ou o do sistema (`FFMPEG_PATH`).

## Acesso ao bucket

Fotos públicas podem usar bucket público ou URL controlada, conforme necessidade real. Arquivos administrativos/sensíveis jamais devem ser públicos por conveniência. As permissões do Storage também fazem parte da revisão de [[12-Seguranca-e-Qualidade]].

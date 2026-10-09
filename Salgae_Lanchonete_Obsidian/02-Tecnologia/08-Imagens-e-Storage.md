---
titulo: "Imagens, vídeos e Storage"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-10-09
---
# Imagens, vídeos e Storage

Voltar: [[00-Comece-Aqui]] · Relacionado: [[05-Painel-Administrativo]]

## Objetivo

Fotos e vídeos tornam o cardápio mais atrativo, mas podem deixar a página lenta, consumir cota de tráfego e gerar arquivos órfãos. Esta política equilibra aparência, desempenho e custo.

## Regras de envio

- Aceitar JPEG, PNG, WebP (e HEIC quando o navegador converter); **armazenar sempre em WebP**, conforme a seção de compressão abaixo.
- Validar tipo real do arquivo, tamanho máximo e dimensões antes de disponibilizar.
- Gerar ou solicitar imagens otimizadas para exibição em celular.
- Usar nomes de arquivo não previsíveis, organizados por ambiente e tipo de recurso.
- Não confiar apenas na extensão enviada pelo navegador.

## Compressão e conversão para WebP (obrigatório)

Toda imagem enviada pelo painel é comprimida e convertida para **WebP** antes de ir para o Storage. O objetivo é deixar o arquivo leve **sem perda visível de qualidade**, tanto na prévia do painel quanto no cardápio do cliente.

### Algoritmo

1. **No navegador (inclusive no celular):** a foto escolhida (galeria ou câmera) é lida com a orientação EXIF aplicada e reduzida para no máximo **2048 px** no maior lado, exportada como JPEG de alta qualidade (0,92). Isso deixa o envio rápido em rede móvel e funciona em todos os navegadores (o Safari não gera WebP pelo canvas). Imagens menores nunca são ampliadas.
2. **No servidor (com admin verificado):** o arquivo é validado pelo **tipo real** (leitura do conteúdo com `sharp`, não pela extensão), girado conforme o EXIF, tem os **metadados removidos** (localização do celular etc.) e é convertido em **duas variantes WebP**:

| Variante | Maior lado | Meta de tamanho | Uso |
| --- | --- | --- | --- |
| `detail` | 1600 px | até ~300 KB | detalhe do produto e destaques |
| `card` | 640 px | até ~80 KB | cards, categorias e miniaturas do painel |

3. **Qualidade adaptativa:** começa em qualidade **82** (`effort` 5, `smartSubsample`). Se passar da meta, reduz de 6 em 6 até o **mínimo de 70** — nunca abaixo disso, para não aparecerem borrões ou blocos. Se mesmo em 70 passar da meta, mantém 70 (qualidade vence tamanho).
4. **Armazenamento:** as duas variantes vão para `product-images` com nome não previsível (UUID); o banco guarda só a base do caminho e a interface escolhe a variante (`srcset`).
5. **Rejeições claras:** arquivo que não é imagem, imagem corrompida, menor que 400 px no menor lado ou maior que 15 MB antes da redução.

> Os números (2048/1600/640 px, metas e qualidade 82→70) são o ponto de partida; ajustar depois de ver fotos reais em celular.

## Substituição de imagem

1. Enviar e validar a nova imagem.
2. Atualizar o registro do produto/destaque para apontar para a nova imagem.
3. Confirmar que nenhum outro registro usa o caminho antigo.
4. Somente então apagar o arquivo antigo.

Se a atualização falhar, a imagem antiga deve continuar disponível. A operação não pode deixar o produto sem foto por exclusão antecipada.

## Exclusão de produto

Antes de excluir um produto, decidir se a regra será desativar (recomendado para operação) ou excluir definitivamente. Caso haja exclusão definitiva, verificar referências e apagar a imagem somente quando ela não for mais usada.

## Exibição pública

Use imagens com tamanho responsivo, carregamento adiado para itens fora da tela e dimensão reservada para evitar que a página "pule" durante o carregamento. Deve haver uma imagem de fallback ou estado visual aceitável para arquivos indisponíveis.

## Vídeos de produto

Cada produto pode ter **um** vídeo curto e opcional. A foto continua obrigatória quando houver vídeo, porque ela é a capa (poster) e o fallback.

### Limites propostos (a confirmar em [[03-Decisoes-do-Projeto]])

| Item | Limite |
| --- | --- |
| Formato | MP4 (H.264) — compatível com todos os celulares; WebM opcional |
| Duração | até 15 segundos |
| Tamanho | até 10 MB por arquivo |
| Resolução | até 720p, vertical ou quadrado |
| Áudio | removido ou ignorado; o vídeo toca sem som |

### Regras de envio

- Validar tipo real, tamanho e duração antes de disponibilizar; rejeitar com mensagem clara.
- Guardar em bucket ou pasta própria (`product-videos`), separada das imagens, com nome de arquivo não previsível.
- Troca e exclusão seguem a mesma ordem segura das imagens: enviar e validar o novo, atualizar o registro, confirmar que o antigo não é mais referenciado e só então apagá-lo.

### Exibição e custo

- Carregar o vídeo apenas no detalhe do produto, com `preload="none"` ou `metadata`, nunca na listagem.
- Servir com cache longo (arquivo novo = caminho novo) para reduzir tráfego repetido.
- Vídeo consome muito mais tráfego que foto. No plano Free do Supabase a cota de Storage e de tráfego é limitada: acompanhar o uso em homologação e, se necessário, migrar os vídeos para um serviço de vídeo dedicado ou para o plano Pro.

## Acesso ao bucket

Fotos públicas podem usar bucket público ou URL controlada, conforme necessidade real. Arquivos administrativos/sensíveis jamais devem ser públicos por conveniência. As permissões do Storage também fazem parte da revisão de [[12-Seguranca-e-Qualidade]].

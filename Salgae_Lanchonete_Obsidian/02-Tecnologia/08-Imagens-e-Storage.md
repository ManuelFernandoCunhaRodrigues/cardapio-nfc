---
titulo: "Imagens, vídeos e Storage"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-10-08
---
# Imagens, vídeos e Storage

Voltar: [[00-Comece-Aqui]] · Relacionado: [[05-Painel-Administrativo]]

## Objetivo

Fotos e vídeos tornam o cardápio mais atrativo, mas podem deixar a página lenta, consumir cota de tráfego e gerar arquivos órfãos. Esta política equilibra aparência, desempenho e custo.

## Regras de envio

- Aceitar apenas formatos de imagem definidos (preferencialmente WebP, JPEG e PNG quando necessário).
- Validar tipo real do arquivo, tamanho máximo e dimensões antes de disponibilizar.
- Gerar ou solicitar imagens otimizadas para exibição em celular.
- Usar nomes de arquivo não previsíveis, organizados por ambiente e tipo de recurso.
- Não confiar apenas na extensão enviada pelo navegador.

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

---
titulo: "Imagens e Storage"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-09-26
---
# Imagens e Storage

Voltar: [[00-Comece-Aqui]] · Relacionado: [[05-Painel-Administrativo]]

## Objetivo

Fotos tornam o cardápio mais atrativo, mas podem deixar a página lenta e gerar arquivos órfãos. Esta política equilibra aparência, desempenho e custo.

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

## Acesso ao bucket

Fotos públicas podem usar bucket público ou URL controlada, conforme necessidade real. Arquivos administrativos/sensíveis jamais devem ser públicos por conveniência. As permissões do Storage também fazem parte da revisão de [[12-Seguranca-e-Qualidade]].

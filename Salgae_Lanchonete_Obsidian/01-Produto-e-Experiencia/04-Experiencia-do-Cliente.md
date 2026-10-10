---
titulo: "Experiência do cliente"
area: Produto
tags:
  - produto
  - experiencia
atualizado: 2026-10-08
---
# Experiência do cliente

Voltar: [[00-Comece-Aqui]] · Relacionado: [[02-Escopo-Atual]]

## Fluxo principal

1. O cliente vê a tag NFC e o QR Code em local visível da mesa/balcão.
2. Aproxima o celular ou escaneia o QR Code.
3. Abre a URL pública da Salgaê no navegador.
4. Visualiza a identidade da lanchonete, funcionamento e itens em destaque.
5. Navega pelas categorias.
6. Abre um produto para ver foto, vídeo curto (quando houver), descrição, preço e situação de disponibilidade.
7. Faz seu pedido seguindo o fluxo presencial definido pela operação.

## Requisitos de experiência

- A primeira tela deve carregar rapidamente em rede móvel.
- O layout deve priorizar toque, texto legível e contraste.
- Categorias devem ser fáceis de encontrar, sem exigir rolagem excessiva.
- Imagens são apoio de decisão, não podem impedir o entendimento caso falhem.
- Vídeo é complemento opcional: nunca deve atrasar a abertura do cardápio nem esconder preço e descrição.
- Preço e disponibilidade devem aparecer sem ambiguidade.
- Deve existir estado vazio para categoria sem produtos e mensagem de erro compreensível.
- O QR Code deve continuar disponível como plano B para celulares sem NFC ou configurações incompatíveis.

## Estrutura recomendada da página pública

1. Cabeçalho: logo/nome, frase curta e eventual horário.
2. Destaques: banner ou cards de combos/novidades configurados pelo painel.
3. Navegação de categorias.
4. Lista de produtos por categoria.
5. Detalhe do produto em modal ou página própria.
6. Rodapé: localização, contato e informação operacional relevante.

## Vídeo do produto

Quando o produto tiver vídeo, ele aparece **somente no detalhe do produto**, no lugar da imagem de destaque:

- a foto é exibida primeiro como capa (poster), com ícone de play;
- o vídeo só é baixado quando o detalhe é aberto, nunca na lista de produtos;
- reprodução sem som, em loop curto e dentro da página (`muted`, `playsinline`), com controle para pausar;
- se o vídeo falhar ou a rede estiver lenta, a foto permanece e nada quebra;
- respeitar a preferência de movimento reduzido do aparelho (não iniciar sozinho nesse caso).

## Estados de disponibilidade

| Situação | Exibição pública |
| --- | --- |
| Ativo e disponível | Produto normal, pronto para consulta. |
| Ativo e temporariamente indisponível | Preferencialmente marcado como “Indisponível no momento”, conforme decisão operacional. |
| Inativo | Não aparece no cardápio público. |

Essas regras precisam ser iguais no painel, API e banco; veja [[07-Modelo-de-Dados-Supabase]].

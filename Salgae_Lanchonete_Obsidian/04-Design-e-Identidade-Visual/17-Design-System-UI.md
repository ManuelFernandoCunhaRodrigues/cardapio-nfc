---
titulo: "Design system da interface"
area: Design
tags:
  - design
  - ui
  - tecnologia
atualizado: 2026-10-09
---
# Design system da interface

Voltar: [[_Indice-04-Design-e-Identidade-Visual]] · Relacionado: [[16-Identidade-Visual]] · [[18-Prototipos-e-Telas]]

Valores retirados do CSS das telas do protótipo. São os tokens que o código deve reproduzir.

## Paleta de interface

| Token | Hex | Onde é usado |
| --- | --- | --- |
| Tinta (rotulado "Verde") | `#17110D` | Fundos escuros: hero, banner de promoção, sidebar do admin, botões secundários, cor do texto principal. |
| Laranja de ação | `#E65F2A` | CTA primário, item de menu ativo, chip de categoria selecionado, badge de promoção, preço em destaque, ícone do carrinho. |
| Laranja forte (texto) | `#C2491A` | **Todo texto laranja** (preços, links, aba ativa) e fundos laranja com texto branco (botões, chips selecionados). Contraste 4,9:1 sobre branco — WCAG AA. O `#E65F2A` fica para fundos sem texto, ícones, sombras e o banner. |
| Creme | `#FAF7EF` | Superfície de cartões e painéis; texto claro sobre fundo escuro. |
| Areia | `#F0E9D8` | Fundo da página e de campos internos. |
| Areia escura | `#EDDFC1` | Fim do gradiente vertical do fundo. |
| Borda | `#E0D6BC` | Todas as bordas de 1 px, divisores e trilho de toggle desligado. |
| Superfície interna | `#F5F0E5` | Campos, blocos de resumo e caixas dentro do celular. |
| Borda interna | `#E8E0CF` | Bordas dentro do celular. |
| Sucesso / Ativo | `#A8441B` (era `#B84C1F`, escurecido para 4,8:1 sobre fundos claros) | Status "Ativo", toggles ligados, links, alerta de estoque baixo. |
| Terracota | `#B35B37` | Destrutivo e negativo: excluir, "Indisponível", "Desativado", "Esgotado". |
| Âmbar | `#F9A436` | Rótulo de combo, borda do campo de estoque baixo. |
| Texto secundário | `#6B5F4A` | Legendas, rótulos, descrições. |
| Texto de corpo | `#3D3527` | Parágrafos longos dentro das telas. |
| Placeholder | `#7A6E58` (era `#8B7E67`, escurecido para 5:1) | Texto de campo vazio. |
| WhatsApp | `#128C7E` sobre `rgba(37,211,102,0.12)` | Somente nos avisos de que o pedido chega pelo WhatsApp. |

Fundo padrão de página: `linear-gradient(180deg, #F0E9D8 0%, #EDDFC1 100%)`. Dentro do celular, o fundo é branco puro (`#FFFFFF`).

> Os nomes "Verde" e "Sucesso" no cartão de paleta do protótipo não correspondem aos valores. Tratar os hex como verdade e renomear os tokens no código (sugestão: `ink`, `brand`, `cream`, `sand`, `border`, `positive`, `danger`, `amber`).

## Tipografia

| Família | Pesos | Uso |
| --- | --- | --- |
| **Poppins** | 500, 600, 700, 800 | Títulos, nomes de produto, preços e números grandes. Classe `.disp`, sempre com `letter-spacing: -0.02em`. |
| **Nunito Sans** | 400, 500, 600, 700 | Fonte base de todo o corpo de texto, botões e formulários. |
| **JetBrains Mono** | 400, 500, 600 | Rótulos, badges e metadados. Classe `.lbl`: 10 px, caixa alta, `letter-spacing: 0.18em`. Classe `.badge`: 9–10 px, caixa alta, `letter-spacing: 0.12em`. |

> O cartão de tipografia do design system exibe "Inter" como fonte de texto, mas o CSS carregado em todas as páginas é **Nunito Sans**. Usar Nunito Sans.

Escala prática observada: 56 px (capa) · 40/32/28 px (títulos de seção) · 24 px (nome do produto na tela de detalhe) · 22/20/18 px (títulos internos) · 16 px (título de lista) · 13–14 px (corpo e botões) · 11–12 px (legendas) · 9–10 px (rótulos mono).

## Forma e profundidade

- **Pílula** (`border-radius: 999px`) para todos os botões, chips, badges e campos de busca — é a assinatura de forma do produto.
- Cartões grandes: 20–24 px · cartões de produto: 16 px · campos: 10–14 px · miniaturas: 8–12 px.
- Bottom sheet da tela de detalhe: `28px 28px 0 0`, sobreposto à imagem com `margin-top: -28px`.
- Moldura do celular: 44 px externo, 32 px interno.
- Sombras discretas: `0 2px 8px rgba(23,17,13,0.06)` em cartões; `0 4px 12px rgba(230,95,42,0.35)` sob elementos laranja em destaque; `0 30px 60px -30px rgba(23,17,13,0.25)` sob a moldura do celular.
- Overlay de modal: `rgba(23,17,13,0.5)` — `0.55` na confirmação de exclusão.
- Imagem ausente: faixas diagonais escuras (`repeating-linear-gradient(135deg, #2A2019, #221A14)`) com o nome do item em mono. Esse marcador deve virar um componente real de *fallback* de imagem.

## Componentes-chave

> Na home do cardápio público, cabeçalho, banner, chips de categoria e cards de produto seguem [[19-Referencia-Layout-Cardapio]] (chips com foto de 60–64 px, cards de 150–160 px com badge e preço em destaque). A tabela abaixo continua valendo para o painel e demais telas.

| Componente | Especificação |
| --- | --- |
| Botão primário | Pílula laranja forte `#C2491A`, texto branco (4,9:1), peso 600–700, 12–16 px de padding vertical. |
| Botão secundário | Pílula `#17110D`, texto creme. |
| Botão neutro | Pílula transparente com borda `#E0D6BC`. |
| Botão destrutivo | Texto/borda em `#B35B37`; preenchido em `#B35B37` quando confirma exclusão. |
| Badge | Pílula mono caixa alta: `TOP` (fundo tinta, texto laranja), `PROMO`/`COMBO` (laranja), `NOVO` (`#B84C1F`), `INDISPONÍVEL`/`DESATIVADO` (terracota). |
| Chip de categoria | Círculo de 48 px com emoji; inativo em `#F5F0E5` com borda, ativo em laranja com sombra colorida e rótulo em tinta. |
| Cartão de produto | 150 px de largura, imagem 120 px, nome 12 px/700, legenda 10 px, preço em Poppins 14 px/800 e botão quadrado 28 px laranja (`+` no delivery, `→` no local). |
| Campo de formulário | Fundo `#F5F0E5`, borda `#E0D6BC`, raio 12 px, 12–14 px de padding, fonte 13 px. |
| Campo em foco | Borda `1.5px #E65F2A` + halo `0 0 0 3px rgba(230,95,42,0.12)`. |
| Toggle | 38×22 px, trilho `#B84C1F` ligado / `#E0D6BC` desligado, botão branco de 18 px. |
| Stepper de quantidade | `−` em círculo branco com borda, número em Poppins 800, `+` em círculo tinta. |
| Barra de carrinho | Pílula tinta de largura total, rótulo à esquerda e total em pílula laranja à direita. |
| Bottom nav (cliente) | 5 colunas, ícone central elevado 44 px em laranja com `margin-top: -16px`; ativo em laranja, inativo em `#6B5F4A`. |
| Bottom nav (admin mobile) | 4 colunas, sem item elevado. |
| Modal | Painel creme, raio 20 px, largura máxima 420–640 px, centralizado sobre overlay. |

## Layout e breakpoints

| Contexto | Medidas |
| --- | --- |
| Telas de cliente e admin mobile | Celular de **390 px** de largura, área útil de 780–800 px de altura. |
| Painel administrativo desktop | Largura máxima **1400 px**, grade `240px` (sidebar) + conteúdo, altura mínima 720 px. |
| Páginas de apresentação do protótipo | Máximo 1200–1500 px, grade de conteúdo + celular de 420 px. |

O painel administrativo tem duas versões completas e equivalentes: desktop (navegação por sidebar) e mobile (navegação por abas no rodapé, formulários em tela cheia com botão salvar fixo). Ambas precisam existir no produto — ver [[05-Painel-Administrativo]].

## Regra de acesso por NFC

Registrada explicitamente no design system, e vale como regra de produto:

> O cartão NFC na mesa abre o navegador direto no cardápio local. **Não há tela ou módulo "NFC" no produto** — é só o meio de entrada.

---
titulo: "Identidade visual da marca"
area: Design
tags:
  - design
  - marca
  - produto
atualizado: 2026-09-27
---
# Identidade visual da marca

Voltar: [[_Indice-04-Design-e-Identidade-Visual]] · Relacionado: [[17-Design-System-UI]] · [[18-Prototipos-e-Telas]]

## Origem desta documentação

Tudo aqui foi extraído da prototipação **"Design MVP de delivery"** (arquivo `Design MVP de delivery.zip`; desde 2026-10-30 fora do repositório, guardado em `materiais/design/` na máquina do responsável e no histórico do git; o protótipo atual está no Claude Design). O pacote contém seis páginas HTML interativas — índice, design system e três protótipos navegáveis — mais os arquivos do logotipo e as referências visuais usadas como inspiração.

Esta é a fonte visual do projeto. Quando o código divergir dela, ou ela divergir do escopo escrito, vale registrar a decisão em [[03-Decisoes-do-Projeto]].

## A marca

**Salgaê** — lanchonete de salgados fritos e assados. Assinatura secundária usada abaixo do logo nos aplicativos: `SALGADOS QUENTES`, em fonte monoespaçada, caixa alta, 7–9 px com `letter-spacing` de 0.2em.

O nome é um trocadilho falado ("salgar" + "é"), e a identidade acompanha esse tom: informal, quente, caseiro, sem verniz corporativo.

## Logotipo

Lettering manuscrito ("script bold"), com:

- corpo das letras em **branco**, contornado em **laranja**;
- **sombra deslocada em verde-escuro**, que dá o volume e o ar retrô de placa de lanchonete;
- uma **coxinha dourada ilustrada** pousada sobre o final da palavra, ocupando o lugar do acento;
- três respingos laranja saindo da coxinha, sugerindo movimento e fritura.

Arquivos disponíveis no pacote:

| Arquivo | Uso |
| --- | --- |
| `assets/salgae-logo.png` | Versão sobre fundo branco. |
| `assets/salgae-logo.webp` | Versão leve com fundo transparente — é a usada em todas as telas do protótipo. |

Nas telas o logo aparece em três tamanhos: 110 px (capa do índice), 38–40 px (topo dos aplicativos e sidebar do painel) e 26 px (avatar da loja no admin mobile). Ele nunca é recortado nem colocado dentro de círculo: fica sempre livre sobre fundo claro, ou dentro de um quadrado escuro arredondado quando precisa de contraste.

## Cores da marca

Extraídas diretamente do arquivo do logotipo:

| Cor | Hex | Papel |
| --- | --- | --- |
| Laranja Salgaê | `#FC4C0B` | Cor principal do lettering e dos respingos. |
| Verde profundo | `#02432D` | Sombra do lettering; é a cor de contraste histórica da marca. |
| Dourado coxinha | `#F5A623` a `#F7C948` | Ilustração do salgado; aparece como âmbar de apoio na interface. |

> **Atenção:** a paleta da interface no protótipo **não usa o verde da marca**. O token que aparece rotulado como "Verde" no design system é, na verdade, `#17110D` — um marrom quase preto. É uma divergência entre marca e produto que precisa de decisão: ou a interface adota o verde `#02432D` como cor escura, ou o rótulo do token é corrigido. Ver [[17-Design-System-UI]].

## Tom de voz na interface

A escrita das telas faz parte da identidade. O padrão observado:

- português brasileiro coloquial, em primeira pessoa do plural ou direto com o cliente;
- frases curtas, sem ponto final em rótulos;
- exemplos reais do protótipo: *"Quentinho"*, *"Feita à mão todo dia. Pede já!"*, *"Ainda tá vazio"*, *"Nada por aqui"*, *"Olá, Salgaê 👋"*, *"Volte pra home e adicione seus salgados."*;
- no cardápio local, o aviso é sempre explícito e sem rodeio: *"Consulta apenas. Faça seu pedido com o atendente."*

Rótulos técnicos e categorias, ao contrário, são secos e em caixa alta monoespaçada: `CATÁLOGO`, `VITRINE`, `ESTOQUE`, `COMBO DO DIA`.

## Linguagem fotográfica

O protótipo ainda não tem fotos: todas as imagens são marcadores listrados em diagonal escura (a classe `.ph`), com o nome do produto escrito por cima. As referências de inspiração incluídas no pacote mostram a intenção — **produto em close, fundo escuro, luz quente lateral, comida como protagonista**. Vale registrar essa direção antes de produzir as fotos reais; a política de arquivos está em [[08-Imagens-e-Storage]].

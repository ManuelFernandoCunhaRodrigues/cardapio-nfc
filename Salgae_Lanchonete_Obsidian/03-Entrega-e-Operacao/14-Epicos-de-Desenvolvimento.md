---
titulo: "Épicos de desenvolvimento"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-11-16
---
# Épicos de desenvolvimento

Voltar: [[13-Roadmap]] · Segurança: [[12-Seguranca-e-Qualidade]]

## Status em 2026-11-16

| Épico | Status | Onde ver |
| --- | --- | --- |
| 0 — Descoberta e preparação | **Feito** | [[09-Ambientes-e-Deploy]], [[03-Decisoes-do-Projeto]] |
| 1 — Fundação da aplicação | **Feito** | Reestruturado em 2026-11 (PRs #74 e #80) |
| 2 — Cardápio público | **Feito** | Redesenho de outubro; PRs #85, #90 e #101 |
| 3 — Gestão de categorias e produtos | **Feito** | PRs #81, #84, #85, #89 e #91 |
| 4 — Imagens, vídeos e destaques | **Feito** | `docs/testes/epico-4-*.md`, `video-compactacao-*.md`; PRs #92 e #94 |
| 5 — Qualidade e homologação | **Parcial** | Falta o teste em celular real; NFC não se aplica |
| 6 — Pronto para demonstrar (antes "Produção e estabilização") | **Parcial** | Ver o Épico 6 abaixo e `docs/publicacao-producao.md` |

## Épico 0 — Descoberta e preparação

**Objetivo:** consolidar requisitos e preparar os ambientes.

- confirmar identidade visual, conteúdo inicial e política de indisponibilidade;
- criar repositório, `main`, `develop` e padrão de PR;
- criar `SALGAE-STAGING` e `SALGAE-PRODUCTION`;
- criar os dois projetos Vercel com variáveis isoladas;
- documentar decisões em [[03-Decisoes-do-Projeto]].

**Pronto quando:** homologação e produção existem, mas somente a homologação é usada durante desenvolvimento.

## Épico 1 — Fundação da aplicação

**Objetivo:** criar a base navegável, tipada e segura.

- configurar framework, TypeScript, estilos e padrão de componentes;
- configurar cliente Supabase por ambiente;
- criar migrations iniciais e RLS;
- implementar login e guarda do painel;
- adicionar tratamento básico de erro e observabilidade.

**Pronto quando:** usuário autorizado acessa o painel em homologação e visitante não acessa áreas privadas.

## Épico 2 — Cardápio público

**Objetivo:** entregar a experiência de consulta no celular.

- home no layout de [[19-Referencia-Layout-Cardapio]]: cabeçalho, busca, banner em carrossel, categorias em círculo, cards de produto e banner de oferta;
- cabeçalho, categorias, produtos e detalhe;
- destaques configuráveis;
- estados de carregamento, vazio e erro;
- responsividade e desempenho;
- comportamento de ativo/indisponível conforme decisão.

**Pronto quando:** dados cadastrados em homologação aparecem corretamente no cardápio público em celular.

## Épico 3 — Gestão de categorias e produtos

**Objetivo:** permitir que a equipe mantenha o catálogo.

- CRUD de categorias;
- CRUD de produtos;
- preço, disponibilidade, ativo/inativo e ordenação;
- validação e confirmação de ações sensíveis;
- prévia e retorno de sucesso/erro.

**Pronto quando:** uma pessoa sem conhecimento técnico consegue atualizar um produto sem quebrar o catálogo.

## Épico 4 — Gestão de imagens, vídeos e destaques

**Objetivo:** assegurar conteúdo visual de qualidade sem desperdício no Storage.

- upload validado, com **compressão e conversão para WebP** (variantes `detail` e `card`, qualidade adaptativa — ver [[08-Imagens-e-Storage]]);
- envio de foto e vídeo **pelo celular** (câmera/galeria), com prévia e progresso;
- preview e fallback;
- substituição atômica de imagem;
- upload opcional de vídeo curto por produto, validado por formato, duração e tamanho;
- player no detalhe do produto com a foto como capa, sem som automático e carregamento sob demanda;
- limpeza de arquivo antigo somente sem referências;
- CRUD de destaques.

**Pronto quando:** alterar ou remover uma foto ou um vídeo não deixa produto inconsistente nem arquivo órfão conhecido, e o vídeo não piora a abertura do cardápio em rede móvel.

## Épico 5 — Qualidade e homologação

**Objetivo:** validar o produto sob condições semelhantes ao uso real.

- testes de regras críticas e revisão de RLS;
- lint, typecheck e build;
- teste manual em celulares e rede móvel;
- teste de NFC/QR e URLs;
- checklist de lançamento preenchido.

**Pronto quando:** os itens críticos de [[12-Seguranca-e-Qualidade]] estiverem aprovados em homologação.

**Status:** parcial. Testes de regras, RLS, lint, typecheck e build rodam no CI em todo PR, com E2E contra o banco local. O checklist foi aprovado no stage em 2026-10-09, e o QR do stage e o da produção foram verificados. Falta o teste em celular real e rede móvel (roteiro em `docs/testes/epico-5-roteiro-celular.md`). O teste de NFC não se aplica à demonstração.

## Épico 6 — Pronto para demonstrar (antes "Produção e estabilização")

> Reinterpretado em 2026-11-15: o sistema é uma demonstração para clientes, sem lançamento no estabelecimento ([[03-Decisoes-do-Projeto]]).

**Objetivo:** ter a produção estável e convincente para mostrar a clientes.

| Item | Status |
| --- | --- |
| Promoção de `develop` para `main` | A primeira foi o PR #11 (primeiro deploy de produção em 2026-10-10); a última, o PR #83, em 2026-11-04. O que entrou depois (#84 a #101) espera a próxima promoção, com o "sim" do responsável. |
| Variáveis e URL pública | Feito: `https://salgae-producao.vercel.app`, com variáveis só da produção e build só de produção. Domínio próprio não se aplica. |
| QR Code | Feito: `docs/qr/salgae-producao-vercel-app.png`, verificado. |
| Tags NFC no estabelecimento | Não se aplica. |
| Orientação da equipe | Não se aplica a uma loja real; `docs/guia-da-equipe.md` serve como material para o cliente. |
| Monitoramento | Parcial: workflow **Ambientes no ar** (ping a cada 2 dias e cópia semanal), que começa a rodar sozinho depois de chegar à `main`; erros em uma linha JSON nos logs da Vercel. |
| Conteúdo de exemplo convincente | Pendente (onda 6). |
| Roteiro de demonstração | Feito em `docs/publicacao-producao.md`. |

**Pronto quando:** a produção abre ativa, com conteúdo de exemplo, e a demonstração pode ser feita do começo ao fim pelo roteiro, sem deixar sujeira depois.

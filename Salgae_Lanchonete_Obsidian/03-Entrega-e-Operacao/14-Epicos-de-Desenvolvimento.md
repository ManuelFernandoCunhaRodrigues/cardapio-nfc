---
titulo: "Épicos de desenvolvimento"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-09-26
---
# Épicos de desenvolvimento

Voltar: [[13-Roadmap]] · Segurança: [[12-Seguranca-e-Qualidade]]

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

## Épico 4 — Gestão de imagens e destaques

**Objetivo:** assegurar conteúdo visual de qualidade sem desperdício no Storage.

- upload validado;
- preview e fallback;
- substituição atômica de imagem;
- limpeza de arquivo antigo somente sem referências;
- CRUD de destaques.

**Pronto quando:** alterar ou remover uma foto não deixa produto inconsistente nem arquivo órfão conhecido.

## Épico 5 — Qualidade e homologação

**Objetivo:** validar o produto sob condições semelhantes ao uso real.

- testes de regras críticas e revisão de RLS;
- lint, typecheck e build;
- teste manual em celulares e rede móvel;
- teste de NFC/QR e URLs;
- checklist de lançamento preenchido.

**Pronto quando:** os itens críticos de [[12-Seguranca-e-Qualidade]] estiverem aprovados em homologação.

## Épico 6 — Produção e estabilização

**Objetivo:** publicar com segurança e acompanhar o primeiro uso.

- promoção de `develop` para `main`;
- conferência de variáveis e domínio/URL pública;
- configuração física das tags NFC e QR Codes;
- orientação curta para a equipe;
- monitoramento de erros e correção de regressões.

**Pronto quando:** o cardápio é acessado no estabelecimento e a equipe consegue atualizá-lo de forma independente.

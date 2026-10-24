---
titulo: "Decisões do projeto"
area: Gestao
tags:
  - gestao
  - projeto
atualizado: 2026-10-13
---
# Decisões do projeto

Voltar: [[00-Comece-Aqui]]

Este arquivo guarda escolhas já feitas. Para cada nova decisão, acrescente data, contexto, decisão, motivo e consequência.

| Status | Decisão | Motivo e consequência |
| --- | --- | --- |
| Definida | O cardápio será para consumo local. | Delivery, carrinho e checkout ficaram fora do MVP. Ver [[02-Escopo-Atual]]. |
| Definida | Supabase/PostgreSQL será o banco de dados. | Centraliza dados, autenticação e armazenamento de arquivos sob regras de acesso. |
| Definida | Haverá dois ambientes separados. | Homologação não pode alterar ou expor os dados da produção. |
| Definida | `develop` alimenta homologação e `main` alimenta produção. | Permite validar mudanças antes de afetar clientes e operação. |
| Definida | Serão dois projetos Vercel, não apenas previews. | Cada ambiente terá vínculo explícito com sua branch e seu Supabase. |
| Definida | O projeto começa dedicado à Salgaê. | Evita complexidade prematura de multi-tenant. |
| Definida | Claude Code orquestra; Codex executa trabalho técnico pesado. | Reduz contexto repetido e dá um fluxo de execução rastreável. Ver [[11-Agentes-de-IA]]. |
| Definida | Projetos Supabase criados na região `sa-east-1` (São Paulo). | Menor latência para clientes no Brasil. Refs registrados em [[09-Ambientes-e-Deploy]]. |
| Definida | Frontend em Next.js + TypeScript, Tailwind CSS e Zod. | Confirma a base recomendada em [[06-Arquitetura-e-Stack]]: área pública, painel, rotas protegidas e deploy no mesmo projeto. |
| Definida | Produto pode ter um vídeo curto opcional, além da foto. | Mostra o alimento de forma mais apetitosa. A foto continua obrigatória como capa e plano B. Ver [[08-Imagens-e-Storage]]. |
| Definida | A home do cardápio segue uma referência visual de app de lanchonete (layout, cards e tipografia). | Dá um padrão moderno e conhecido ao cliente. Itens de pedido, conta e avaliação foram retirados. Ver [[19-Referencia-Layout-Cardapio]]. |
| Definida | Imagens são comprimidas e convertidas para WebP (variantes `detail` 1600 px e `card` 640 px, qualidade 82→70). | Cardápio leve na rede móvel sem perda visível. Algoritmo em [[08-Imagens-e-Storage]]. |
| Definida | O painel deve permitir cadastrar produtos, fotos e vídeos pelo celular. | Quem atende cadastra na hora, pelo próprio aparelho. Ver [[05-Painel-Administrativo]]. |
| Definida | Testes cruzados entre Claude Code e Codex em toda entrega. | Cada um valida a ideia dos testes do outro antes de rodar. Ver [[11-Agentes-de-IA]]. |

### Ambientes Supabase em São Paulo

- **Data:** 2026-10-08
- **Contexto:** era preciso criar o par homologação/produção previsto em [[09-Ambientes-e-Deploy]]; só existia um projeto com nome automático, pausado e em `us-east-1`.
- **Decisão:** criar `SALGAE-STAGING` e `SALGAE-PRODUCTION` em `sa-east-1`, no plano Free.
- **Por quê:** proximidade com os clientes e custo zero durante o desenvolvimento.
- **Impacto:** variáveis de ambiente de cada projeto Vercel apontam para o Supabase correspondente; o projeto antigo fica fora do fluxo.
- **Revisão:** antes do lançamento, avaliar plano Pro para produção (evita pausa automática).

### Stack do frontend

- **Data:** 2026-10-08
- **Contexto:** o Épico 1 depende da escolha do framework, que estava pendente.
- **Decisão:** Next.js (App Router) com TypeScript, Tailwind CSS e Zod.
- **Por quê:** é a base já recomendada; concentra cardápio público, painel e validação em um único deploy Vercel.
- **Impacto:** inicia o Épico 1 em [[14-Epicos-de-Desenvolvimento]].
- **Revisão:** somente se surgir requisito que o Next.js não atenda bem.

### Vídeo do produto

- **Data:** 2026-10-08
- **Contexto:** além da foto, a Salgaê quer mostrar o alimento em vídeo no cardápio.
- **Decisão:** cada produto pode ter **um** vídeo curto e opcional, exibido no detalhe do produto. A foto continua sendo a capa (poster) e o fallback.
- **Por quê:** vídeo valoriza o produto (textura, recheio, preparo) sem mudar o fluxo de consulta.
- **Impacto:** coluna `video_path` em `products` ([[07-Modelo-de-Dados-Supabase]]), política de vídeo em [[08-Imagens-e-Storage]], player no detalhe ([[04-Experiencia-do-Cliente]]), upload no painel ([[05-Painel-Administrativo]]) e entrega no Épico 4 ([[14-Epicos-de-Desenvolvimento]]).
- **Revisão:** após medir o consumo de Storage e tráfego em homologação.

### Compactação automática de vídeo

- **Data:** 2026-10-10
- **Contexto:** o painel só validava o vídeo (MP4/WebM, 15 s, 10 MB) e publicava o arquivo como veio. Vídeo comum de celular (25–35 MB) era recusado, e o que passava chegava pesado ao cliente. O responsável pediu: "o vídeo deve ficar sempre leve, para o cliente conseguir ver com facilidade, e com boa qualidade".
- **Decisão:** todo vídeo é compactado **no servidor**, com `ffmpeg`, antes de ser publicado. Saída única: MP4 H.264, sem áudio, até 720p, até 30 quadros por segundo, início rápido, alvo de até 3 MB para 15 s (teto de 4 MB). O painel passa a aceitar MP4, MOV e WebM de até 50 MB e 15 s. O original fica num bucket privado só durante o processamento e é apagado em seguida.
- **Por quê:** compactar no celular de quem envia (navegador) daria uma qualidade diferente por aparelho e não funciona bem em todos os iPhones e Androids; no servidor o resultado é sempre igual e pode ser medido. O volume é pequeno (um vídeo por produto), então processar na hora, sem fila, é o mais simples que funciona, cabe nos limites do plano gratuito da Vercel e é o mesmo código quando o projeto for para um servidor próprio.
- **Impacto:** política em [[08-Imagens-e-Storage]]; bucket privado novo e limite menor no bucket público (migration `20261011003026_video_compression_storage.sql`); dependência `ffmpeg-static`; rota `/admin/midia/video`; testes em `docs/testes/video-compactacao-*.md`.
- **Revisão:** depois do primeiro vídeo real enviado por celular em stage (iPhone e Android), e se o tempo de compactação na Vercel passar de um minuto ou o volume de vídeos crescer — nesse caso, avaliar fila/servidor próprio.

### Layout da home do cardápio

- **Data:** 2026-10-08
- **Contexto:** foi escolhida uma referência visual de app de lanchonete para o layout, os cards e a tipografia da home.
- **Decisão:** seguir [[19-Referencia-Layout-Cardapio]], com banner principal em degradê laranja Salgaê, título do banner em **Anton**, badges de produto (`MAIS PEDIDO`, `NOVO`, `QUENTINHO`) sem preço promocional e barra inferior Início · Cardápio · Busca · Info. Carrinho, favoritos, avaliações e notificações da referência ficam de fora.
- **Por quê:** padrão moderno e familiar para o cliente, sem sair do escopo de consulta no local.
- **Impacto:** campo `badge` em `products` ([[07-Modelo-de-Dados-Supabase]]), fonte Anton no design system e Épico 2 ([[14-Epicos-de-Desenvolvimento]]).
- **Revisão:** após testes com clientes no local.

### Indexação por ambiente e cabeçalhos de segurança

- **Data:** 2026-10-10
- **Contexto:** homologação e produção rodam o mesmo código; a homologação não pode aparecer em buscadores nem ser confundida com o cardápio real.
- **Decisão:** a variável `NEXT_PUBLIC_SITE_ENV` define o ambiente. Só `production` libera indexação; qualquer outro valor (ou ausência) bloqueia tudo. O painel é sempre `noindex`. Todas as rotas recebem cabeçalhos de segurança (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS). Content-Security-Policy ficou para depois do lançamento.
- **Por quê:** falhar para o lado seguro — um ambiente mal configurado nunca é indexado por engano.
- **Impacto:** variáveis em [[09-Ambientes-e-Deploy]]; roteiro em `docs/publicacao-producao.md`.
- **Revisão:** ao definir o domínio público e ao avaliar a CSP.

### Migrations aplicadas pelo GitHub Actions

- **Data:** 2026-10-13
- **Contexto:** as migrations eram aplicadas à mão, pelo SQL Editor ou pela ferramenta do Supabase. Em produção, duas ficaram registradas com versão diferente da do repositório, e a ordem "banco antes do código" dependia de alguém lembrar.
- **Decisão:** o workflow **Migrations** usa a CLI do Supabase. No stage aplica sozinho a cada merge na `develop`. Em produção a aplicação é um passo manual no GitHub (Run workflow), e o PR para a `main` é reprovado enquanto a produção não tiver as migrations.
- **Por quê:** a versão registrada passa a ser sempre a do arquivo, o histórico fica no GitHub e a produção continua dependendo de uma pessoa decidir.
- **Impacto:** `.github/workflows/migrations.yml` e `docs/migrations-pelo-ci.md`. Depende de três segredos cadastrados pelo responsável e de um acerto único no histórico de migrations da produção; até lá o workflow só avisa. Migration nova precisa funcionar com o código que já está em produção, porque o banco muda antes.
- **Revisão:** depois da primeira promoção feita por esse caminho.
### Banco local no CI, testes de RLS automáticos e testes de ponta a ponta

- **Data:** 2026-10-13
- **Contexto:** os testes de RLS eram rodados à mão no stage, as migrations nunca tinham sido aplicadas do zero fora dele e nenhum teste passava pela tela. Reordenar pelo painel, por exemplo, só tinha teste de banco.
- **Decisão:** todo PR sobe o Supabase local em contêineres, aplica todas as migrations em um banco vazio, confere se os tipos versionados batem com esse banco, roda os testes SQL e depois os testes de ponta a ponta (Playwright) contra o build de produção. O administrador de teste só existe nesse banco e a senha é sorteada a cada execução.
- **Por quê:** migration que só funciona em cima do stage, política de acesso afrouxada por engano e fluxo quebrado na tela passam a barrar o merge em vez de aparecerem depois.
- **Impacto:** `.github/workflows/ci.yml`, `supabase/config.toml`, `e2e/`, `scripts/testar-banco-local.sh`; resultados em `docs/testes/banco-local-e-ponta-a-ponta-resultados.md`. O CI fica cerca de 3 minutos mais longo. Envio de foto e vídeo e as telas de categorias, destaques e loja ainda não têm teste de ponta a ponta.
- **Revisão:** ao criar tela nova no painel ou tabela nova no banco.
### Endereço do produto pelo nome

- **Data:** 2026-10-14
- **Contexto:** o produto abria em `/produto/<código>`, um identificador de 36 caracteres que não diz nada a quem recebe o link.
- **Decisão:** o endereço passa a ser o nome (`/produto/coxinha-de-frango`). O banco gera esse nome de endereço na criação, sem acentos, e resolve repetição com `-2`, `-3`. Renomear o produto não muda o endereço, para links já compartilhados continuarem valendo. Os endereços antigos por código redirecionam (308) para o novo, o que mantém funcionando os destinos de destaque e qualquer link já enviado.
- **Por quê:** link legível e que se apresenta melhor quando compartilhado, sem quebrar o que já existe.
- **Impacto:** migration `20261014150000_product_slug`, rota `app/(public)/produto/[slug]`, sitemap e prévia de link pelo nome. O painel continua abrindo o produto pelo código. Se o nome mudar muito, o endereço fica com o nome antigo; trocar exige editar o banco.
- **Revisão:** se o responsável quiser editar o endereço pelo painel.

### Auditoria e posição de item novo feitas pelo banco

- **Data:** 2026-10-14
- **Contexto:** o painel gravava a auditoria numa segunda chamada, depois da alteração, e ignorava a falha; uma mudança podia ficar sem registro. A posição de um item novo era calculada lendo o maior `sort_order` e inserindo em seguida, e duas criações ao mesmo tempo podiam pegar a mesma posição.
- **Decisão:** gatilhos no banco registram em `audit_logs` toda criação, alteração e exclusão de categorias, produtos, destaques e dados da loja, na mesma transação. A permissão de gravar direto em `audit_logs` foi retirada de todos os usuários. Outro gatilho põe o item novo no fim da lista, com trava para criações simultâneas.
- **Por quê:** se a mudança acontece, o registro existe; se o registro falha, a mudança não acontece. E o histórico não pode ser forjado nem pelo administrador.
- **Impacto:** migration `20261014120000_audit_and_sort_order_triggers`; ações do painel mais curtas (`lib/admin/action-helpers.ts`). O registro passa a ser por coluna alterada: a "direção" de uma reordenação e os números da compactação de vídeo não aparecem mais no histórico, e uma troca de posição gera dois registros, um por item. Testes em `supabase/tests/audit_and_sort_order.sql`.
- **Revisão:** quando a ideia 21 (usuários e rastreabilidade) for desenvolvida, porque ela vai ler esse histórico.

### Content-Security-Policy

- **Data:** 2026-10-14
- **Contexto:** a CSP tinha ficado para depois do lançamento (ver "Indexação por ambiente e cabeçalhos de segurança").
- **Decisão:** todas as rotas saem com uma CSP que só aceita scripts do próprio site, proíbe `eval` em produção, `<object>`, moldura por outro site, `<base>` de fora e envio de formulário para outro domínio, e libera o Supabase só para imagens, vídeos e conexões. Scripts em linha continuam permitidos porque o Next coloca os dados de cada página em `<script>` sem nonce; usar nonce obrigaria a gerar cada página a cada visita e perder as páginas estáticas do cardápio.
- **Por quê:** fecha a porta para script injetado de outro domínio e para o site ser emoldurado, sem trocar desempenho por isso.
- **Impacto:** `lib/security/csp.ts` e `next.config.ts`. Os testes de ponta a ponta falham se qualquer página aberta tiver recurso bloqueado. Serviço externo novo (mapa embutido, análise de acesso, fonte de outro domínio) precisa entrar na política.
- **Revisão:** se o Next passar a gerar páginas estáticas com nonce, ou ao incluir serviço externo.

### Página de produto com leitura própria, prévia de link e sitemap

- **Data:** 2026-10-13
- **Contexto:** a página de um produto lia o cardápio inteiro para achar um item, o link compartilhado (WhatsApp, redes) saía sem descrição nem foto e os buscadores não tinham a lista de páginas.
- **Decisão:** a página lê só o produto pedido, a categoria dele e os outros itens da mesma categoria. Cada produto ganha título, descrição, endereço canônico e dados de prévia de link (Open Graph), com a foto quando houver. As páginas dos produtos ativos são geradas no build e continuam se atualizando sozinhas. O `sitemap.xml` lista início, cardápio, informações e produtos, e só existe em produção; em stage fica vazio, como o `robots.txt` já bloqueia tudo.
- **Por quê:** menos dados trafegados a cada visita, link que se apresenta bem quando alguém compartilha e produção encontrável sem expor o stage.
- **Impacto:** `lib/menu/get-public-menu.ts`, `lib/seo/`, `app/sitemap.ts` e `app/robots.ts`. Se o banco estiver lento no build, as páginas de produto passam a ser geradas na primeira visita em vez de derrubar o build. O endereço do produto continua sendo o identificador; trocar por um nome legível exige migration e fica como ideia.
- **Revisão:** ao definir o domínio público.

### Refatoração de design do cardápio e do painel

- **Data:** 2026-10-12
- **Contexto:** o responsável pediu um novo visual, com a logo centralizada, a partir de uma nova referência; depois pediu os produtos em cards em pé, em faixa horizontal.
- **Decisão:** aprovado o desenho descrito em [[23-Refatoracao-de-Design-2026-10]]: cabeçalho com situação da loja, logo centralizada e informações; fundo creme com cartões brancos; banner escuro com título em duas cores; Poppins e Nunito Sans (saem a Anton e a JetBrains Mono, o que **revê** a decisão "Layout da home do cardápio" de 2026-10-08); verde da marca para Aberta/Disponível/NOVO; cards em pé em faixa horizontal; barra inferior com 4 abas. No painel: lista "Precisam de atenção" no resumo e edição de produto sem a barra inferior. O desenvolvimento começa sem esperar fotos reais dos produtos.
- **Por quê:** pedido do responsável; o produto é vitrine para apresentar a clientes e o visual pesa nessa apresentação.
- **Impacto:** [[17-Design-System-UI]] e [[19-Referencia-Layout-Cardapio]] passam a valer com as mudanças da nota 23; sem mudança em banco, rotas ou regras de acesso. Entrega em pacotes: cardápio do cliente, carrossel de destaques e painel.
- **Revisão:** depois de o responsável conferir no stage. A ida para a produção acontece junto com a compactação de vídeo, quando ele autorizar.
- **Em produção desde 2026-10-13**, autorizado pelo responsável no chat, junto com a compactação de vídeo.

### Carrossel automático de destaques

- **Data:** 2026-10-12
- **Contexto:** o responsável quer cadastrar quantos destaques quiser e vê-los rolando sozinhos no cardápio. Já não havia limite de quantidade; faltava a troca automática.
- **Decisão:** conforme [[22-Carrossel-de-Destaques]]: troca a cada 6 segundos, em ciclo, com pausa ao interagir, pontinhos clicáveis, botão de pausar e sem troca automática quando o aparelho pede menos animação. Sai a faixa que repetia o segundo destaque. O painel ganha contador de ativos e aviso acima de 8 ativos, sem limite.
- **Por quê:** dá visibilidade a todos os destaques sem exigir que o cliente arraste; o botão de pausar atende à regra de acessibilidade para conteúdo que se move sozinho.
- **Impacto:** tela inicial do cardápio e `/admin/destaques`; sem migration e sem biblioteca nova.
- **Revisão:** depois do uso em stage; rever o tempo de 6 segundos se o responsável quiser mudar.
- **Revisão de 2026-10-13:** depois de ver o stage, o responsável pediu o banner maior (240 px), os pontinhos embaixo no centro e **sem o botão de pausar**. Ficam as pausas por toque, mouse e teclado. Em produção desde 2026-10-13.

### Separar backend e frontend, Motion e Playwright

- **Data:** 2026-10-23
- **Contexto:** mudança anotada em 2026-10-19 em [[25-Mudanca-Separar-Backend-e-Frontend]]; o responsável pediu para planejar e executar.
- **Decisão:** monorepo com `apps/web` (Next.js), `apps/api` (Hono) e `packages/core`; API como segundo projeto na Vercel Hobby, com Dockerfile para VPS; ordem Playwright → separação → Motion.
- **Por quê:** os testes ampliados protegem a separação; a API própria deixa o sistema pronto para a VPS de cada cliente sem custo na demonstração.
- **Impacto:** estrutura de pastas, CI, projetos da Vercel e segurança (CSP, CORS só para o vídeo). Plano em `docs/planejamento/separacao-backend-frontend-plano.md`.
- **Revisão:** depois da prova de conceito do Hono com ffmpeg na Vercel (primeiro passo da separação).

## Modelo de registro para próximas decisões

### Título da decisão

- **Data:** AAAA-MM-DD
- **Contexto:** qual problema ou oportunidade motivou a conversa?
- **Decisão:** o que foi escolhido?
- **Por quê:** quais critérios pesaram?
- **Impacto:** quais documentos, dados ou partes do produto precisam mudar?
- **Revisão:** quando essa escolha deve ser reavaliada?

## Decisões pendentes relevantes

- Forma de contato do cliente com a equipe durante a visita.
- Onde hospedar os vídeos: Supabase Storage (padrão proposto) ou serviço de vídeo dedicado, conforme o consumo de tráfego no plano Free.
- Imagem ou vídeo nos destaques: pedido em 2026-10-13 e planejado em [[24-Planejamento-Midia-em-Categorias-e-Destaques]]; faltam as respostas do responsável e a ordem para desenvolver.
- Política visual: identidade, cores, fotos, tamanhos e textos.
- Imagens nos destaques dos alimentos: o responsável mencionou a possibilidade em 2026-10-12; falta ele detalhar o que quer além da foto que cada destaque já aceita ([[22-Carrossel-de-Destaques]]).
- Fotos das categorias: o responsável pediu a opção de imagem por categoria em 2026-10-13; planejado em [[24-Planejamento-Midia-em-Categorias-e-Destaques]] (o desenho continua aparecendo quando não houver foto).
- Papéis de acesso do painel.
- Cache no navegador (service worker) para o cardápio abrir mais rápido e sem internet: ideia registrada em 2026-10-24 em [[26-Ideia-Cardapio-Rapido-e-Sem-Internet]]; proposta de entrar na Fase 3 do plano de separação, aguardando o responsável.
- Controle de estoque e status "Promoção" do protótipo do painel: ficaram fora do Épico 3 (não estão no escopo nem no banco); decidir se entram.
- Se haverá métricas anônimas desde a primeira versão.

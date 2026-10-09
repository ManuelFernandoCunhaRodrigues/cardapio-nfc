---
titulo: "Decisões do projeto"
area: Gestao
tags:
  - gestao
  - projeto
atualizado: 2026-10-09
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

### Layout da home do cardápio

- **Data:** 2026-10-08
- **Contexto:** foi escolhida uma referência visual de app de lanchonete para o layout, os cards e a tipografia da home.
- **Decisão:** seguir [[19-Referencia-Layout-Cardapio]], com banner principal em degradê laranja Salgaê, título do banner em **Anton**, badges de produto (`MAIS PEDIDO`, `NOVO`, `QUENTINHO`) sem preço promocional e barra inferior Início · Cardápio · Busca · Info. Carrinho, favoritos, avaliações e notificações da referência ficam de fora.
- **Por quê:** padrão moderno e familiar para o cliente, sem sair do escopo de consulta no local.
- **Impacto:** campo `badge` em `products` ([[07-Modelo-de-Dados-Supabase]]), fonte Anton no design system e Épico 2 ([[14-Epicos-de-Desenvolvimento]]).
- **Revisão:** após testes com clientes no local.

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
- Limites finais de vídeo (duração, tamanho e resolução) e se destaques também poderão ter vídeo.
- Política visual: identidade, cores, fotos, tamanhos e textos.
- Fotos das categorias na home: foto própria por categoria ou emoji como fallback ([[19-Referencia-Layout-Cardapio]]).
- Papéis de acesso do painel.
- Controle de estoque e status "Promoção" do protótipo do painel: ficaram fora do Épico 3 (não estão no escopo nem no banco); decidir se entram.
- Se haverá métricas anônimas desde a primeira versão.

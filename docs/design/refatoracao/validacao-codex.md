# Validacao da especificacao de design (Codex)

- Data: 2026-10-10. Modelo: Codex/GPT-5. Esforco: alto (leitura da especificacao, telas listadas, rotas, componentes, queries, migrations e escopo; sem rede e sem executar a aplicacao).

## Veredito (uma linha: APROVADA / APROVADA COM RESSALVAS / REPROVADA)

APROVADA COM RESSALVAS

## Achados

| n. | gravidade | onde | problema | evidencia no codigo | correcao sugerida |
| --- | --- | --- | --- | --- | --- |
| 1 | media | Secao 4, tela 05b | “Abre segunda as 08:00” nao e texto atualmente produzido. `opensNext` e uma `Date`, mas a pagina so formata hora: “Abre as HH:MM”. | `app/(public)/(listas)/info/page.tsx:19`; `lib/store/opening-hours.ts:10-15,65-73` | Formatar tambem o dia da semana de `opensNext`, no fuso `America/Sao_Paulo`; prever override manual, que nao fornece proxima abertura. |
| 2 | media | Secao 7, “Comportamento novo, pequeno” | A lista omite que cabecalho compartilhado exige mudar a home e criar/alterar uma composicao de rota, alem das paginas citadas. Nao ha hoje layout do grupo `(listas)` nem componente de cabecalho. | Home tem cabecalho proprio em `app/(public)/(listas)/page.tsx:31-34`; diretorio so contem as tres rotas; `app/(public)/layout.tsx:1-5` so inclui a nav. | Acrescentar `app/(public)/(listas)/page.tsx`, novo `components/menu/public-header.tsx` e, se for compartilhado por grupo, novo `app/(public)/(listas)/layout.tsx`. Definir se o detalhe tambem recebe o cabecalho. |
| 3 | media | Secao 7, item 1 | Chip ativo por rolagem nao cabe apenas no Server Component atual: requer ilha Client Component, `IntersectionObserver`, sincronizacao com hash/foco e fallback sem JS. | `app/(public)/(listas)/cardapio/page.tsx:9-15` e Server Component; chips sao links simples. | Classificar como comportamento cliente novo; isolar somente chips/lista no cliente e respeitar `prefers-reduced-motion` para rolagem suave, se usada. |
| 4 | media | Secao 7, itens 6 e 7 | “Precisam de atencao” e “Loja hoje” nao sao so estilo: o resumo atual apenas conta registros e nao le `store_settings`; a lista precisa de consulta com campos e de regra de deduplicacao (indisponivel **ou** sem foto). | `app/admin/(painel)/page.tsx:10-15`; leitura existente em `lib/store/get-store-settings.ts:9-28`. | Declarar novas consultas no dashboard. Nao exige migration/RLS: admin ja pode ler produtos e `store_settings` tem select autenticado/admin. |
| 5 | baixa | Secao 7, item 8 | Esconder a barra na edicao altera `AdminShell`, que hoje a renderiza incondicionalmente para toda rota mobile. O formulario ja tem salvar fixo acima dela. | `components/admin/admin-shell.tsx:20`; `components/admin/product-form.tsx:65,78` | Manter o item e explicitar alteracao condicional por pathname em `admin-shell.tsx`; confirmar que cobre novo e edicao. |
| 6 | baixa | Secao 4, telas 04/04b e secao 7 item 9 | O vazio desenhado pede botao e atalhos; hoje busca recebe somente produtos. A contagem e a busca por nome+descricao ja existem. | `app/(public)/(listas)/busca/page.tsx:6-8`; `components/menu/search-results.tsx:11-17`; `lib/menu/search.ts:7-10` | Buscar categorias na pagina e passar ao componente; incluir no impacto tambem `lib/menu/get-public-menu.ts` somente se for criada uma consulta combinada. |
| 7 | baixa | Secao 4, telas 02 e 05 | “3 itens”, “10 produtos - 6 categorias” e “Sabado - hoje” sao derivados, nao campos do banco; nenhum e gerado hoje como texto. | Contagem derivavel em `app/(public)/(listas)/cardapio/page.tsx:14`; dias em `app/(public)/(listas)/info/page.tsx:8-13,21`; fontes de dados em `lib/menu/get-public-menu.ts:10-35`. | Tratar como regra de apresentacao. Para resumo, decidir se “produtos” significa todos no painel ou apenas ativos/publicos. |
| 8 | baixa | Secoes 2 e 4 | A afirmacao sobre fonte e tokens esta correta no essencial, mas “todos os valores atuais foram mantidos” nao e verificavel depois da proposta; atualmente nao ha `green`, `green-soft`, `amber-soft`, `danger-soft` ou `peach`, e `positive` e marrom. | `app/globals.css:4-26`; fontes em `app/layout.tsx:2,8-11`. | Registrar como tokens a criar/substituir, nao como tokens existentes. |
| 9 | baixa | Secoes 4 e 8 | O video atual so inicia apos toque, mas, quando iniciado, usa `autoPlay`, `loop` e controle nativo; a regra “sem tocar sozinho com movimento reduzido” nao esta implementada literalmente. | `components/menu/media-video.tsx:14-22` | Ao redesenhar, consultar `prefers-reduced-motion`, nao iniciar automaticamente nessa preferencia e manter alternativa de capa/botao. |

## Conferencia elemento -> dado real

| tela | elementos confirmados | ressalva |
| --- | --- | --- |
| 01 Inicio | status: `getStoreStatus`; aviso: `store_settings.notice`; destaque: `highlights.title/description/image_path/target`; categorias: `name/slug/image_path`; 8 produtos: `sortProductsForHome`. `app/(public)/(listas)/page.tsx:17-39`; `lib/menu/get-public-menu.ts:10-61`. | Header compartilhado e banner inteiro-link sao novos; segundo destaque existe como `highlights[1]`. |
| 02 Cardapio | categorias, `slug`, produtos por `category_id`, `is_available`, imagem, selo, preco e descricao existem. `cardapio/page.tsx:10-15`; `product-card.tsx:9-20`; schema `20261008222757_initial_schema.sql:16-28`; badge `20261009103822_product_badge.sql:2-4`. | Lista vertical, contador e chip ativo sao apresentacao/comportamento novos. |
| 03 Detalhe | produto, categoria, badge, preco, disponibilidade, foto e `video_path` existem. `produto/[id]/page.tsx:33-40`; `media-video.tsx:10-22`. | “VIDEO CURTO · SEM SOM” e mensagem longa de indisponibilidade sao textos novos; `video_path` exige `image_path` pelo schema. |
| 04 Busca | busca local por nome+descricao, total e grade existem. `search-results.tsx:11-17`; `search.ts:7-10`. | Botao e atalhos requerem categorias na pagina. |
| 05 Info | horarios, override, aviso, endereco, mapa, telefone, WhatsApp e Instagram existem. `get-store-settings.ts:12-16`; migration `20261008232020_store_settings.sql:3-15`. | Dia da proxima abertura e sufixo “hoje” precisam de formatacao nova; WhatsApp hoje usa icone `phone` (`info/page.tsx:21`; `icons.tsx:3,13`). |
| 06-09 Painel mobile | login, KPIs, CRUD, `toggleProduct`, `reorderProduct`, `deleteProduct`, foto/video e preview existem. `admin/(painel)/page.tsx:10-22`; `products-manager.tsx:31-45`; `produtos/actions.ts:96-159`; `product-form.tsx:65-79`. | Lista de atencao, switch e menu de reticencias sao novos controles/consulta, sem nova acao de banco. |
| 10-12 Painel desktop | cinco destinos do menu, dados da loja, destaques e formulario/preview existem. `admin-shell.tsx:8-20`; `destaques/page.tsx:6-8`; `loja/page.tsx:6-8`; `product-form.tsx:65-77`. | Atalho “novo destaque” deve apontar ao gerenciador existente; nao ha rota `/admin/destaques/novo`. |

## Comportamentos novos: revisao da lista

- Itens 1-9 estao corretos como necessidade funcional. Nao exigem migration, RLS, rota nem mudanca no envio de midia: campos e permissoes ja existem (`supabase/migrations/20261008225427_harden_rls.sql:94-124`; `20261008232020_store_settings.sql:40-57`).
- Acrescentar: formatar `opensNext` com dia da semana; exibir contagens por categoria/resumo; aplicar estado indisponivel tambem a preco/texto no detalhe; e decidir navegacao/foco ao clicar chip/hash.
- `toggleProduct` ja revalida `/`, `/admin`, `/admin/produtos` e o produto (`produtos/actions.ts:44-49,96-108`). A nova consulta do resumo sera atualizada por essa revalidacao; leitura de loja tem acoes/revalidacao proprias a conferir na implementacao.
- Arquivos faltantes na lista: home, `admin-shell.tsx` para ocultar nav, e o novo componente/layout do cabecalho. Os arquivos citados existem, inclusive `components/ui/button.tsx`, `card.tsx` e `input.tsx`.

## Acessibilidade e desempenho

- Contraste informado nao foi recalculado nesta revisao; os hex atuais confirmados sao `brand-strong #C2491A`, `cream #FAF7EF`, `danger #983F22` e `positive #A8441B` (`app/globals.css:4-20`). Validar contraste apos trocar estados para verde.
- Chips de 36 px, menu de 36 px e switch de 32 px precisam de area clicavel minima de 44 px, foco visivel e rotulo acessivel. A seta decorativa deve ficar `aria-hidden`; o link inteiro precisa ter nome acessivel, sem links aninhados.
- Para switch e menu, anunciar estado/ocupado; para a lista de atencao e resultado de busca, usar atualizacao de leitor de tela sem repetir informacao. Os resultados ja usam `aria-live` (`search-results.tsx:16`).
- A imagem do primeiro destaque ja recebe `priority` quando existe (`page.tsx:36`), e o video nao baixa antes do toque (`media-video.tsx:21-22`). Manter dimensoes/responsividade de imagem e nao tornar todos os destaques LCP.
- O observer de chips e o cabecalho/nav ativos adicionam JS cliente. Limitar a ilha ao necessario; `PublicNav` ja e cliente (`public-nav.tsx:1-20`). As quatro paginas publicas usam `revalidate = 60`; um cabecalho que consulte status em todas amplia leituras/cache a cada minuto, mas nao muda o modelo de dados.

## O que esta correto e pode seguir

- O escopo permanece consulta local: nao ha carrinho, pedido, pagamento, desconto, avaliacao, notificacao ou perfil. Links de telefone/WhatsApp apenas contato constam de `store_settings`; o escopo ainda pede decisao sobre chamar atendente/WhatsApp (`02-Escopo-Atual.md:29-53`).
- Os fatos auditados procedem: quatro familias carregadas hoje; `.display` usa Anton e `.lbl` JetBrains Mono; somente a home tem cabecalho proprio; “Conferir” tem `py-2` (32 px com texto de 12 px); filtro admin e `select`; busca e nome+descricao; e `getStoreStatus` retorna `isOpen`, `closesAt` e `opensNext`.
- Produtos indisponiveis continuam publicos porque a consulta filtra `is_active`, nao `is_available` (`lib/menu/get-public-menu.ts:25-35`), compativel com as telas marcadas como indisponiveis.
- Logo e rotas propostas existem: `/info`, `/cardapio`, `/busca`, `/produto/[id]`, `/admin/produtos/novo` e `/admin/produtos/[id]`; arquivo da marca confirmado em `public/brand/salgae-logo.webp`.

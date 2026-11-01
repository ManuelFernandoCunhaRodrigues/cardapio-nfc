# Proposta técnica — pedido pela mesa

**Status:** planejamento para validação; não é especificação de implementação aprovada.  
**Base analisada:** `README.md`, migrations em `supabase/migrations/`, `lib/supabase/`, rotas públicas e administrativas, e os documentos indicados no vault.  
**Premissa:** consumo no local, sem delivery e sem pagamento online.

## A. Resumo da recomendação

1. Manter o cardápio de consulta público e acrescentar um carrinho local, revisão e envio de pedido por mesa.
2. Identificar cada mesa por QR com token opaco e não previsível; o QR não deve conter apenas `mesa=5`.
3. Para a primeira versão, liberar pedidos somente durante uma **sessão curta de mesa** aberta pelo atendente/caixa quando a mesa é ocupada; o cliente não precisa chamar garçom para cada pedido.
4. O envio cria um pedido imutável com itens e preços em snapshot, validado em transação pelo banco; o navegador nunca determina preço nem disponibilidade.
5. Usar uma KDS (tela de cozinha) como canal principal, com atualização em tempo real e confirmação visual/sonora; a impressão é contingência ou fase posterior.
6. O pedido passa por estados explícitos (`novo`, `em_preparo`, `pronto`, `entregue`, `cancelado`), com histórico e responsável em cada alteração.
7. Separar os papéis `admin`, `cozinha` e `atendente`; hoje só há `admin` ativo no modelo.
8. Para a futura VPS, a menor mudança funcional é manter o Supabase Cloud e hospedar só o Next.js; se a exigência for retirar o SaaS, usar Supabase self-hosted antes de reescrever Auth, Storage e API.
9. Há incertezas operacionais decisivas: impressora/modelo, quantidade de mesas, política para pedido errado, processo de conta e se o Wi‑Fi de clientes será obrigatório.

**Ponto de partida confirmado no código:** `supabase/migrations/20261008225427_harden_rls.sql` deixa as policies `leitura anon de produtos ativos`, `leitura anon de categorias ativas` e `leitura anon de destaques ativos` para `anon`, e reserva escrita às policies `admin ...`; `lib/menu/get-public-menu.ts` usa esse acesso anônimo, enquanto `lib/admin/require-admin.ts` exige `private.is_admin()`. A proposta abaixo preserva essa separação, em vez de dar escrita direta ao visitante.

## B. Fluxo do cliente e da equipe

### Cliente na mesa

1. O cliente aponta a câmera para o QR da mesa e abre uma URL que contém o token opaco daquela mesa.
2. O cardápio continua navegável. Quando há sessão ativa para a mesa, a interface permite adicionar itens ao carrinho; sem sessão, explica que a mesa precisa ser liberada no caixa/atendimento.
3. O cliente escolhe quantidades, revisa mesa, itens, observação permitida e total estimado. O total é apenas informativo até a validação final.
4. Ao confirmar, a interface desabilita novo clique, envia uma chave de idempotência e aguarda o identificador/número do pedido.
5. A confirmação mostra “Pedido #N enviado à cozinha”, horário e o estado inicial. Um novo pedido posterior é outro pedido, ligado à mesma sessão/conta da mesa.

### Cozinha

1. A KDS autenticada recebe o pedido novo imediatamente por Realtime; se o canal estiver indisponível, ela consulta periodicamente a fila aberta.
2. A cozinha reconhece o pedido e o move para `em_preparo`; ao terminar, marca `pronto`.
3. A tela mantém visíveis mesa, número sequencial, horário, itens, quantidades e observação. Preço não é necessário para produção, mas permanece no dado do pedido para conferência.
4. A entrega pode ser marcada pela cozinha ou pelo atendente como `entregue`. Cada mudança gera evento auditável.

### Atendente/caixa e fechamento

1. Ao acomodar uma mesa, o atendente abre uma sessão com prazo (por exemplo, até o fechamento ou no máximo o turno) e, se desejado, confere o número da mesa com o cliente.
2. O atendente vê pedidos em aberto por mesa, acompanha exceções, pode cancelar/rejeitar antes ou durante o preparo conforme a política definida, e fecha a sessão ao encerrar a conta.
3. No fechamento, o caixa soma os pedidos `novo`, `em_preparo`, `pronto` e `entregue` que a regra comercial considerar cobrados. O pagamento continua fora do sistema nesta fase; registrar opcionalmente valor/forma de pagamento só deve entrar se o responsável aprovar.
4. Depois de `fechada`, a sessão não aceita novos pedidos. Reabrir exige ação explícita e auditoria.

### Exceções explicitadas

| Situação | Comportamento proposto |
| --- | --- |
| Cliente pede duas vezes | Dois envios deliberados criam dois pedidos separados na mesma sessão. Clique repetido/reenvio por queda de conexão não duplica: a mesma `idempotency_key` retorna o pedido já criado. A confirmação precisa deixar claro o número de cada pedido. |
| Produto fica indisponível entre escolha e envio | A transação consulta `products` naquele instante e só aceita `is_active = true` e `is_available = true` com categoria ativa. O pedido inteiro é rejeitado com a lista de itens indisponíveis; o carrinho é preservado para o cliente remover/substituir. Não substituir preço ou produto silenciosamente. |
| Pedido enviado por engano | Não há autoexclusão. Por poucos minutos, o cliente vê instrução para chamar a equipe; atendente/admin pode cancelar, com motivo e ator, se a cozinha ainda não iniciou. Depois de `em_preparo`, o cancelamento requer permissão e motivo, pois pode haver desperdício/cobrança. O prazo e a regra comercial são decisões pendentes. |
| Internet do salão cai | Pedidos já confirmados permanecem no banco e na KDS. O celular não deve prometer envio enquanto não receber confirmação; mantém o carrinho local e oferece tentar novamente quando voltar. A cozinha continua com a última fila carregada e usa contingência manual para pedidos não confirmados. Se a internet também cortar a KDS, não há sincronização nova: usar bloco/comanda manual e lançar/reconciliar depois, sem “re-enviar tudo” às cegas. |

## C. Identificação da mesa

Em todas as alternativas, o QR precisa apontar para HTTPS e a mesa deve possuir um identificador interno estável (`dining_tables.id`) e um rótulo humano (`label`, por exemplo, “Mesa 07”). O rótulo não é segredo.

| Abordagem | Como funciona | O que impede / não impede | Custo operacional |
| --- | --- | --- | --- |
| **1. ID fixo na URL** | QR contém `/mesa/7` ou `?mesa=7`; o backend associa diretamente o pedido. | Não impede pedido falso de fora, troca de mesa digitando outro número nem reutilização de QR fotografado. É identificação, não autenticação. | Mínimo, mas inadequado para aceitar pedidos sem outra barreira. |
| **2. Token opaco permanente por mesa, rotacionável** | QR contém token aleatório longo; banco guarda somente seu hash e pode revogá-lo/emitir outro. | Dificulta adivinhação e adulteração de URLs. Não prova presença física: foto do QR ainda pode ser usada fora. A rotação invalida QR vazado, mas exige reimpressão. | Baixo; operar rotação e trocar etiqueta quando necessário. |
| **3. Token opaco + sessão curta aberta pela equipe** | O QR identifica a mesa, mas `place_order` só aceita quando há sessão ativa e não expirada, aberta pelo caixa/atendente e fechada na conta. | Impede QR isolado fora do horário/sessão e reduz muito o reaproveitamento de foto; durante a sessão, alguém com foto ainda pode pedir remotamente. Evita troca de mesa porque a sessão é de uma mesa específica, mas o cliente pode fisicamente apontar para QR de outra mesa; a equipe deve conferir casos suspeitos. | Médio: abrir/fechar mesa é uma ação por ocupação, não por pedido. |
| **4. Código rotativo exibido na mesa** | Além do QR, o cliente informa código curto que muda em painel/display, ou recebe código da equipe. | Reduz uso de foto antiga e pedido remoto; não impede alguém de repassar o código válido em tempo real. Sem display, código impresso não é rotativo. | Médio/alto: display, troca manual de código ou entrega de código; cria fricção para cliente. |

**Recomendação para a primeira versão: abordagem 3.** Usar QR com token opaco rotacionável por mesa, mais sessão curta aberta/fechada pelo atendente ou caixa. Ela preserva o pedido autônomo — a equipe não transcreve cada item —, cria conta por visita e limita bastante QR fotografado sem depender de geolocalização ou obrigar todos ao Wi‑Fi. A política deve tratar a sessão como credencial de baixa confiança, com limites e supervisão; não como prova criptográfica de presença física.

Token permanente deve ter pelo menos 128 bits aleatórios, ser armazenado como hash e nunca ser derivado do número da mesa. A URL pode conter o token, mas logs e referers devem ser minimizados; a página não deve carregar recursos de terceiros que recebam a URL. A tela administrativa precisa permitir revogar e reemitir token e gerar/baixar novo QR.

## D. “Só dentro do restaurante”

Não há mecanismo de navegador que prove, de forma absoluta, que uma pessoa está fisicamente no salão. O objetivo realista é reduzir pedidos falsos e tornar abusos rastreáveis, sem bloquear clientes legítimos.

| Opção | O que realmente garante | Como é burlada | O que quebra para cliente legítimo | Privacidade |
| --- | --- | --- | --- | --- |
| IP de saída do Wi‑Fi do salão | No servidor do aplicativo, permite aceitar envio originado daquela conexão de internet. | Cliente pode compartilhar Wi‑Fi, usar VPN/proxy dentro da rede, ou alguém externo pode ter acesso à rede/credencial. Não distingue mesa nem pessoa. Em Supabase chamado direto pelo navegador, o banco vê a infraestrutura/API, não uma validação de IP controlada pelo app; exige endpoint próprio/proxy confiável. | Quem usa 4G/5G, Wi‑Fi com portal/captive portal ou outra rede não consegue pedir. IP público dinâmico/CGNAT pode mudar ou ser compartilhado; deve haver atualização/alternativa. | Baixo: tratar IP como dado pessoal, registrar apenas o mínimo/hasheado e com retenção curta. |
| Geolocalização do navegador | Indica que o aparelho autorizou e reportou coordenadas dentro de uma margem do endereço. | GPS pode ser impreciso em interior e localização pode ser simulada/manipulada; não é prova de presença. | Permissão negada, aparelho sem GPS/precisão, navegador restrito ou cliente que não quer compartilhar localização. A configuração atual já bloqueia `geolocation` por `Permissions-Policy`; seria preciso alterá-la se essa opção fosse adotada. | Alto: coleta localização precisa requer propósito, aviso, consentimento e retenção mínima. |
| Token de mesa de curta validade/rotativo | Limita janela de reutilização de QR/código vazado. | Foto/código pode ser compartilhada enquanto válido; quem estiver fora ainda consegue usar a credencial. | QR estático expira e exige troca frequente; código manual cria atrito. | Baixo, pois não precisa identificar pessoa. |
| Sessão de mesa aberta pela equipe | Vincula pedido a uma ocupação/conta conhecida e define quando a mesa pode pedir. | Foto do QR ainda funciona enquanto a sessão estiver aberta se não houver outro fator; equipe pode abrir a mesa errada. | Pequena espera inicial e dependência de abertura no atendimento; cliente em 4G continua funcionando depois. | Baixo: registra dados operacionais da mesa, não localização. |
| Combinação: sessão + token opaco + opcional IP do Wi‑Fi | É a melhor redução prática de abuso: sessão limita tempo, token evita enumeração e IP acrescenta sinal de rede. | Ainda não é prova física; QR/fator válido compartilhado em tempo real continua possível. | Modo rígido de IP bloqueia 4G; oferecer fluxo aprovado pela equipe evita bloquear venda. | Soma dados de rede; documentar finalidade e retenção. |

**Decisão recomendada:** restringir **somente o envio de pedidos**, não a visualização do cardápio. Hoje `categories`, `products`, `highlights` e `store_settings` já têm leitura `anon` por RLS e as rotas públicas são cacheáveis (`revalidate = 60` em `/cardapio`). Bloquear a leitura piora a chegada por QR/NFC, quebra consulta em 4G e pouco acrescenta contra pedido indevido. O botão de adicionar/enviar deve exigir sessão de mesa ativa.

Na primeira versão, usar token opaco + sessão de mesa e limites de abuso. O IP do Wi‑Fi pode entrar como **sinal adicional** ou requisito configurável por loja, desde que exista exceção aprovada pela equipe para 4G. Geolocalização não é recomendada: aumenta fricção e dados sensíveis sem garantia proporcional.

## E. Modelo de dados proposto

As tabelas existentes permanecem como catálogo: `public.categories`, `products`, `highlights`, `store_settings`, `profiles` e `audit_logs`. Em particular, `products.price_cents`, `is_active` e `is_available` continuam sendo a fonte atual da venda; o pedido copia seus valores no momento de envio e não reescreve produto algum.

### Tabelas novas

| Tabela | Colunas principais e regras |
| --- | --- |
| `public.dining_tables` | `id uuid`, `label text unique`, `is_active boolean`, `token_hash text unique`, `token_version integer`, `created_at`, `updated_at`. Opcional `sort_order`/`notes`. Não guardar token bruto. `label` tem `check trim <> ''`. |
| `public.table_sessions` | `id uuid`, `table_id` FK, `status` (`open`, `closed`, `expired`), `opened_at`, `expires_at`, `closed_at`, `opened_by`/`closed_by` FKs para `auth.users`, `customer_note` opcional. Uma única sessão `open` por mesa via índice único parcial. |
| `public.orders` | `id uuid`, `display_number bigint` único/sequencial, `table_session_id` FK, `table_id` FK redundante para consulta protegida, `status`, `source` (`table_qr`, `counter`), `subtotal_cents`, `item_count`, `customer_note`, `idempotency_key uuid`, `submitted_at`, `accepted_at`, `ready_at`, `delivered_at`, `cancelled_at`, `cancelled_by`, `cancel_reason`, `created_at`, `updated_at`. `subtotal_cents >= 0`; unicidade `(table_session_id, idempotency_key)`. |
| `public.order_items` | `id uuid`, `order_id` FK `on delete restrict`, `product_id uuid null` FK `on delete set null`, `product_name_snapshot text`, `unit_price_cents integer`, `quantity smallint`, `line_total_cents integer`, `customer_note` opcional. `quantity` entre 1 e limite decidido (sugestão 20), valores não negativos e `line_total_cents = unit_price_cents * quantity` validado no servidor. |
| `public.order_status_events` | `id bigint`, `order_id` FK, `from_status`, `to_status`, `actor_id uuid null`, `actor_role text`, `reason text null`, `metadata jsonb`, `created_at`. Inserido somente por funções/processos autorizados; é histórico append-only. |
| `public.kitchen_print_jobs` *(somente se houver impressão)* | `id uuid`, `order_id` FK, `status` (`pending`, `leased`, `printed`, `failed`, `cancelled`), `attempts`, `leased_until`, `printer_name`, `last_error`, `printed_at`, `created_at`. Não marcar como impresso antes do agente confirmar sucesso. |

Índices essenciais: `dining_tables(label)` único e `token_hash` único; índice parcial de `table_sessions(table_id) where status = 'open'`; `orders(table_id, submitted_at desc)`, `orders(status, submitted_at)` com filtro para estados abertos, `orders(table_session_id, submitted_at)`, chave única de idempotência acima; `order_items(order_id)`; `order_status_events(order_id, created_at)`; e `kitchen_print_jobs(status, created_at)` parcial para pendências. Usar `timestamptz` em todas as datas e `integer` em centavos, coerente com `products.price_cents`.

DDL ilustrativo — não é migration final:

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  display_number bigint generated always as identity unique,
  table_session_id uuid not null references public.table_sessions(id),
  table_id uuid not null references public.dining_tables(id),
  status text not null check (status in ('new','in_preparation','ready','delivered','cancelled','rejected')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  item_count smallint not null check (item_count between 1 and 50),
  idempotency_key uuid not null,
  submitted_at timestamptz not null default now(),
  unique (table_session_id, idempotency_key)
);
```

### Máquina de estados

`new → in_preparation → ready → delivered` é o fluxo normal. `new → rejected` atende falha operacional antes de assumir preparo; `new` ou `in_preparation → cancelled` exige papel autorizado e motivo. `ready → cancelled` só deve ser permitido por admin, com justificativa. Estados finais (`delivered`, `cancelled`, `rejected`) não voltam atrás: correção é novo evento/pedido de ajuste, preservando a verdade histórica. A transição é feita em RPC/função transacional, nunca por `update` livre na tabela.

O `orders.table_id` deve ser conferido contra a sessão na função e não pode ser escolhido pelo navegador. A redundância é intencional para telas de fila/conta e pode ser protegida por trigger/função; se essa integridade não for implementada, remover a coluna e obter mesa via `table_sessions`.

## F. Segurança

### Criação anônima sem escrita ampla

O visitante anônimo não ganha `insert` em `orders`, `order_items`, `table_sessions` ou eventos. A única porta pública é uma RPC em schema exposto, por exemplo `public.place_table_order(...)`, executada como `security definer`, com dono controlado, `set search_path = ''` e privilégios mínimos. Alternativamente, um Route Handler do Next.js pode validar e chamar uma RPC interna com credencial de servidor; não usar `service_role` no navegador.

Em uma transação, a RPC deve:

1. validar formato, tamanho e quantidade dos itens e da chave de idempotência;
2. localizar o hash do token de mesa, confirmar mesa ativa e sessão `open` dentro de `expires_at`;
3. para a mesma chave de idempotência, retornar o pedido já criado antes de criar outro;
4. bloquear/ler os produtos solicitados no banco e aceitar apenas produto e categoria ativos, com `is_available = true`;
5. obter nome e `price_cents` exclusivamente de `products`, calcular subtotal/linhas no banco e gravar snapshots;
6. criar `orders`, itens e evento inicial `new` atomicamente; retornar apenas o resumo necessário;
7. falhar por completo se algum item for inválido/indisponível ou se o limite for excedido.

Nunca aceitar `price_cents`, subtotal, status, `table_id` ou usuário administrativo enviados pelo cliente. Uma observação deve ser limitada (por exemplo, 250 caracteres, sem HTML) e ser opcional; não introduzir personalização de produto sem modelá-la e precificá-la explicitamente.

### RLS e privilégios

| Origem/papel | Leitura | Escrita permitida |
| --- | --- | --- |
| `anon` visitante | Mantém leitura atual de catálogo ativo e `store_settings`; recebe resumo apenas pela RPC de pedido. Não lê pedidos, mesas, sessões, eventos nem fila. | Nenhuma escrita direta; somente `execute` na RPC pública estreita. |
| `cozinha` autenticada/ativa | Pedidos abertos, itens e eventos necessários para produção; não perfis, tokens de mesa ou dados desnecessários. | Somente transições próprias (`new`/`in_preparation`/`ready`) e eventos por RPC; não altera preço, itens ou sessão. |
| `atendente` autenticado/ativo | Mesas, sessões e pedidos de conta/atendimento. | Abre/fecha sessões; transições permitidas, cancelamento com motivo e contingência de pedido de balcão, se aprovado. |
| `admin` autenticado/ativo | Todos os dados operacionais e catálogo/auditoria. | Gerencia catálogo, mesas/tokens, usuários/papéis e exceções autorizadas. |

No estado atual, `profiles.role` tem `check (role in ('admin'))` e `private.is_admin()` decide as políticas administrativas; as políticas atuais para catálogo e Storage usam essa função. A evolução deve ampliar o `check` para `admin`, `kitchen` e `attendant`, criar helpers privados como `private.has_role(...)`, e alterar somente políticas/GRANTs necessários. Não relaxar as políticas atuais de catálogo: `anon` continua só lendo produtos/categorias/destaques ativos; `Storage` mantém escrita/listagem somente `admin` para os buckets `product-images`, `highlight-images` e `product-videos`.

### Abuso, spam e duplicidade

- Limitar na borda/Route Handler por IP e por token de mesa (por exemplo, tentativas por minuto e pedidos por sessão); os valores finais precisam ser calibrados pelo uso e não devem bloquear pedidos legítimos em horário de pico.
- Aplicar teto por envio: máximo de itens distintos, máximo de unidades por item e máximo de itens totais; não expor detalhe do token inválido.
- Usar `idempotency_key` gerada pelo cliente por ação de envio, unicidade no banco, botão bloqueado e recuperação por consulta/retorno da mesma chave.
- Manter sessão curta, expirar automaticamente, fechar no caixa e permitir revogação/rotação do QR. Registrar tentativas inválidas de forma agregada e com retenção curta.
- Auditar abertura/fechamento de sessão, cancelamento, troca de estado, reimpressão e rotação de token em `audit_logs` ou em log operacional próprio. Proteger dados pessoais: não coletar nome/telefone do cliente nesta versão.

## G. Cozinha

| Alternativa | Vantagens | Limitações e cuidados |
| --- | --- | --- |
| **1. KDS no navegador com Realtime** | Sem hardware especial; tablet/PC já serve; fila, cores, cronômetro e estados ficam visíveis; histórico e recuperação são simples. Supabase Realtime pode publicar mudanças de `orders`/eventos após habilitar as tabelas na publicação e configurar RLS. | Exige tela ligada, sessão de cozinha e internet. Precisa de fallback por polling e alerta sonoro/visual; em queda total de internet usa comanda manual. O Realtime não é usado pelo projeto atual, portanto sua configuração e autorização são trabalho novo. |
| **2. Impressão automática ESC/POS** | Papel é familiar, funciona como registro físico e não depende de operador olhando tela o tempo todo. | Um site hospedado na Vercel/nuvem não consegue abrir conexão arbitrária para impressora USB ou IP privada na rede do salão. Não basta chamar `window.print()`: isso abre diálogo/imprime página e não garante ticket automático. Há duplicidade, papel, falha e status de impressão a controlar. |

Para ESC/POS, as opções reais são:

- **Agente local pequeno (recomendável se imprimir):** serviço em um mini-PC/caixa ou Raspberry Pi na rede local, autenticado, que busca/recebe `kitchen_print_jobs`, imprime em USB/TCP e confirma sucesso. Implementar *lease*, tentativas e deduplicação por `job.id` para não repetir ticket ao reiniciar.
- **Impressora com nuvem/fabricante:** o backend envia à API do fornecedor. Reduz agente local, mas cria custo, dependência de internet e pesquisa de compatibilidade.
- **Tablet com app de impressão:** app nativo/gerenciado conversa com Bluetooth/USB/rede. É viável, mas acrescenta operação e manutenção do app; navegador comum não resolve automaticamente.
- **WebUSB/Web Serial:** pode conversar com alguns dispositivos a partir do navegador, mas depende de permissões, navegador compatível (em geral não Safari/iOS), tela aberta e ação do usuário. Não serve como base robusta para impressão automática.

**Recomendação:** começar com **KDS em tablet/PC no navegador** e um procedimento de contingência manual. É o menor risco para uma lanchonete pequena: nenhuma instalação local além da tela, estados ficam centralizados e o time aprende o fluxo antes de comprar/configurar impressora. Se a operação realmente exigir papel, adicionar agente local e `kitchen_print_jobs` depois de confirmar modelo, conexão e local do equipamento.

Se a impressora falhar, a KDS continua sendo fonte de verdade; exibir alerta “não impresso”, manter job pendente/`failed`, permitir reimpressão explícita e nunca bloquear o pedido ou marcar produção concluída por ter imprimido. Se KDS e impressão estiverem indisponíveis, usar comanda manual numerada e reconciliar no sistema assim que possível, evitando duplicar pedidos já exibidos.

## H. Papéis

| Papel | Finalidade | Não pode fazer |
| --- | --- | --- |
| `admin` | Configura catálogo, disponibilidade, mesas/QR, perfis, relatórios e correções excepcionais. | Deve evitar operar a fila cotidiana quando há papel mais restrito; não há motivo para o caixa usar esta conta. |
| `kitchen` | Vê somente fila necessária e muda estado de preparo/pronto; pode reconhecer contingência de impressão. | Não edita produto/preço, não abre/fecha conta, não vê tokens/gestão de usuários. |
| `attendant` (atendente/caixa) | Abre/fecha sessão, confere conta da mesa, acompanha pedidos e executa cancelamentos permitidos. | Não administra usuários, catálogo, preços nem QR sem permissão adicional. |

Hoje há login por e-mail/senha via `supabase.auth.signInWithPassword` em `components/admin/login-form.tsx`; `requireAdmin()` e `private.is_admin()` aceitam apenas perfil ativo com `role = 'admin'`. A mudança não pede contas de clientes: funcionários usam Auth; visitantes continuam anônimos e passam pela RPC. Criar rotas/layouts separados (`/cozinha`, `/caixa` ou equivalente), verificações de papel no servidor e RLS no banco. Não reutilizar o painel de admin como “cozinha” apenas escondendo menus.

## I. Banco em VPS Ubuntu

### 1. Inventário real do Supabase hoje

- **Postgres / schema `public`:** `categories`, `products`, `highlights`, `profiles`, `audit_logs`, `store_settings`; a coluna `products.badge` foi acrescentada depois. Preços estão em `products.price_cents` (inteiro), e produto usa `is_active`/`is_available`.
- **Integridade/automação:** FKs de `products.category_id` e `profiles.id → auth.users`; checks de preço, slug, papéis e horários; índices de ordenação/categoria/auditoria; trigger `public.set_updated_at()` em tabelas relevantes.
- **RLS:** ativo nas tabelas públicas. Visitante `anon` lê catálogo ativo e dados da loja; autenticado admin lê também inativos e gerencia conteúdo; `profiles` e `audit_logs` são restringidos. A função `private.is_admin()` é `security definer`, está fora do schema exposto e é a base das policies atuais. A migration inicial criou `public.is_admin()`, mas a migration de endurecimento a substitui/remova por `private.is_admin()`.
- **Auth:** Supabase Auth, sessão por cookies com `@supabase/ssr`; o login administrativo é e-mail/senha. Não foi possível confirmar por leitura de repositório se já há usuários em produção — o vault registra que faltava criar o primeiro admin em 2026-10-10; portanto isso é **incerto**.
- **Storage:** buckets públicos `product-images`, `highlight-images` e `product-videos`; leitura pública por URL e listagem/escrita/remoção só para admin, com RLS em `storage.objects`. Imagens WebP usam caminhos de base com variantes `-card.webp`/`-detail.webp`; vídeos são MP4/WebM.
- **Data API/PostgREST:** usada diretamente pelos clientes Supabase do navegador/servidor para leituras e pelo painel para CRUD, respeitando RLS. A URL pública de mídia é construída como `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/...` em `lib/media.ts`.
- **Realtime:** não é usado hoje. Só passa a ser necessário se a KDS adotar atualização em tempo real; nesse caso deve ser habilitado e testado com as novas tabelas e políticas.

### 2. Caminhos possíveis

| Caminho | Vantagens | Custos/riscos |
| --- | --- | --- |
| **Manter Supabase Cloud e hospedar apenas Next.js na VPS** | Menor alteração; preserva Auth, RLS, Data API, Storage, backups gerenciados e URLs/API já usadas. Entrega mais simples a outra pessoa. | Continua dependente/cobrando Supabase Cloud e precisa manter credenciais/egress entre VPS e serviço. |
| **Supabase self-hosted por Docker Compose na VPS** | Mantém o modelo mental e boa parte do app: Postgres, Auth/GoTrue, Storage, PostgREST e Realtime; oferece controle de dados/custos. | Responsável passa a operar vários serviços, segredos, SMTP, backups de banco **e arquivos**, atualização e segurança. Não é “apenas instalar Postgres”. |
| **Postgres puro + Auth/Storage/API próprios** | Menos componentes Supabase a longo prazo e liberdade completa de arquitetura. | Maior reescrita e risco: substituir autenticação, sessão, RLS/API, upload/URLs, regras de arquivo e possivelmente Realtime. Não traz valor para este MVP nem para a transferência. |

**Recomendação:** para a entrega inicial, manter **Supabase Cloud** e rodar somente o Next.js na VPS Ubuntu. É a única opção que não exige migração agora e preserva integralmente o sistema já validado. Se a exigência contratual for hospedar dados na VPS, escolher **Supabase self-hosted por Docker Compose**, em fase própria e homologação, antes de considerar Postgres puro. Não recomendar reescrever Auth/Storage/API agora.

### 3. Se a VPS precisar receber o Supabase self-hosted

**Capacidade inicial sugerida:** 4 vCPU, 8 GB RAM, 80 GB SSD com volume persistente e backup externo; aumentar conforme número de fotos/vídeos, retenção de backups e uso de Realtime. Esses números são ponto de partida, não dimensionamento confirmado: faltam quantidade de produtos/mídia, acessos e crescimento (**incerto**).

Controles mínimos:

- Docker Compose com versões fixadas, volumes persistentes fora do ciclo de containers e segredos únicos; SMTP funcional para Auth e domínio/API próprios.
- Proxy reverso Caddy ou Nginx com TLS automático/renovação, HTTP→HTTPS, limites de corpo e cabeçalhos. Expor publicamente somente 80/443; firewall bloqueia Postgres, serviços internos e painel administrativo direto. Restringir Studio, se habilitado, a VPN/rede administrativa.
- Backup: `pg_dump` lógico diário para restauração portátil, retenção definida; arquivamento de WAL para recuperação pontual se o volume justificar; cópia versionada/criptografada do Storage e dos backups **fora** da VPS. Testar restauração completa em máquina/ambiente isolado pelo menos trimestralmente, medindo tempo e verificando mídia.
- Atualizações: acompanhar releases e avisos de segurança, atualizar em homologação com backup e teste de login/RLS/upload/restauração, só então produção; nunca usar tags flutuantes sem plano de rollback.

Migração resumida, em janela planejada:

1. Inventariar versão/esquemas, migrations aplicadas, buckets, tamanho, usuários e DNS; criar ambiente de homologação self-hosted primeiro.
2. Aplicar as migrations versionadas na ordem atual e comparar schema, funções, grants, RLS, índices e buckets/policies. Rodar `supabase/tests/rls_regression.sql` e `supabase/tests/rls_mutation_check.sql` contra o destino após adaptação segura.
3. Exportar/importar os dados `public` com ferramenta PostgreSQL apropriada, preservando IDs/sequências e conferindo contagens/checksums. Migrar `storage.objects` conforme o procedimento suportado pela implantação e, separadamente, copiar os **objetos físicos** dos três buckets; validar amostra e URLs.
4. Tratar Auth explicitamente: usuários/senhas/identities pertencem ao schema `auth` e não devem ser recriados manualmente. A possibilidade de transportar hashes e dados depende de acesso/export suportado pelo Supabase Cloud e da compatibilidade de versão; isso é **incerto** sem inspeção administrativa. Planejar, se não houver migração suportada, recriação de usuários e redefinição de senha antes do corte.
5. Congelar escritas no catálogo, fazer export final incremental, validar login, RLS, mídia e app apontando ao novo endpoint; trocar DNS/variáveis, monitorar e manter rollback para o Cloud até estabilizar.

Não copiar somente o banco: um dump de `storage.objects` sem os arquivos deixa URLs quebradas. Também não expor `service_role` no frontend durante a migração.

### 4. O que muda e o que não muda no app

Muda:

- `NEXT_PUBLIC_SUPABASE_URL` passa para o domínio HTTPS da API self-hosted; `NEXT_PUBLIC_SUPABASE_ANON_KEY` passa para a chave pública/anon correspondente. Segredos de servidor, se houver agente/endpoint, ficam sem prefixo `NEXT_PUBLIC_`.
- Configuração de URLs permitidas/redirecionamento do Auth, SMTP e DNS/TLS; `NEXT_PUBLIC_SITE_URL` passa para o domínio do site.
- Como `lib/media.ts` monta URL pública a partir da URL Supabase, as URLs de mídia apontarão ao novo Storage se o endpoint compatível for preservado. Cache/CDN e política de URLs públicas precisam ser revisados.

Não precisa mudar, se o Supabase self-hosted expuser API compatível e schema/policies forem migrados corretamente:

- Componentes `@supabase/supabase-js` e `@supabase/ssr`, cookies de sessão, consultas PostgREST e a maior parte do código do catálogo/painel.
- Nomes de tabelas, `price_cents`, RLS, buckets e paths de mídia existentes.
- Next.js 16, TypeScript, Tailwind e as rotas públicas/admin. Ainda assim, teste tudo; compatibilidade é objetivo de implantação, não garantia automática.

### 5. Rodar o Next.js fora da Vercel

Usar Node.js 22 (como em `package.json`), `npm ci`, `npm run build` e `npm run start` atrás de Caddy/Nginx. Pode ser processo gerenciado por `systemd`/PM2 ou container Docker; para uma única VPS, `systemd` com usuário sem privilégios é simples e suficiente, enquanto Docker padroniza a entrega se a equipe já operar Compose. Não executar como root.

O proxy deve encaminhar WebSocket/SSE quando Realtime/KDS usar, preservar cabeçalhos de host/proto confiáveis, aplicar TLS e configurar `client_max_body_size` acima do maior upload. O projeto aceita Server Actions até **16 MB** (`next.config.ts`); reservar margem moderada (por exemplo, 20 MB) no proxy, sem liberar upload ilimitado. `sharp` é dependência de produção para validar/gerar mídia: a imagem/host deve ter binário compatível com Linux glibc, memória temporária e permissões de escrita necessárias; confirmar em homologação com upload real. Continuar aplicando limites de tipo/dimensão já existentes e monitorar disco/CPU nas conversões.

## J. Fases de entrega sugeridas

| Fase | Entrega e teste de aceite | Esforço relativo |
| --- | --- | --- |
| 0. Decisões e protótipo operacional | Validar papéis, mesas, regra de cancelamento/conta, fluxo em papel e protótipo de telas; testar QR em mesa real. | P |
| 1. Fundação de mesa e segurança | `dining_tables`, QR opaco, perfis `kitchen`/`attendant`, sessão aberta/fechada e RLS/RPC testadas. Aceite: token não enumerável, mesa sem sessão não envia pedido, 4G pode consultar cardápio. | M |
| 2. Cliente envia pedido | Carrinho local, revisão, RPC transacional, snapshots, indisponível no envio, idempotência e confirmação. Aceite: clique duplicado não duplica, dois pedidos intencionais aparecem separados e preço nunca vem do cliente. | M |
| 3. Operação de cozinha/caixa | KDS com Realtime + polling, máquina de estados, painel de mesas/conta, auditoria e contingência documentada. Aceite: pedido chega à fila, passa por todos os estados e equipe fecha sessão; teste de queda/retorno de rede. | M |
| 4. Piloto no salão | Homologação com mesas reais, treinamento, limites/rate limit, observabilidade e checklist de abertura/encerramento. Aceite: turno simulado com pedido errado, produto esgotado, QR fotografado e internet interrompida. | M |
| 5. Impressão ESC/POS (se necessária) | Agente local, fila/lease/reimpressão e monitoramento. Aceite: impressora desligada, sem papel e reinício não perdem nem duplicam ticket sem sinalização. | G |
| 6. Migração para VPS/Supabase próprio (somente se aprovada) | Homologação, backup/restauração, migração de mídia/Auth e corte controlado. Aceite: restauração testada e app completo no destino. | G |

## K. Riscos e decisões do responsável

1. A cozinha usará KDS, impressora térmica ou ambos? Se já existe impressora, qual marca/modelo, conexão (USB, rede, Bluetooth) e onde ficará ligada?
2. Quantas mesas existem, como são nomeadas e haverá balcão/retirada além das mesas?
3. Quem abre a sessão da mesa e em que momento: ao sentar, no primeiro pedido ou no caixa?
4. Cliente pode fazer vários pedidos na mesma conta? Até quando a sessão fica aberta?
5. Quem pode cancelar pedido, até qual estado/minuto e como a equipe trata item já preparado?
6. O caixa precisa registrar pagamento/forma de pagamento ou apenas somar e encerrar a sessão nesta fase?
7. “Só dentro do restaurante” deve bloquear somente enviar (recomendado) ou também visualizar? É aceitável liberar exceção para cliente em 4G?
8. O Wi‑Fi de clientes tem IP de saída conhecido/estável e haverá alguém para manter essa regra se ele mudar?
9. Há política para produto esgotado: rejeitar pedido inteiro (recomendado inicialmente), permitir envio parcial ou sugerir substituição após contato?
10. A cozinha precisa ver observações do cliente? Quais observações são aceitáveis e haverá itens com adicionais/remover ingredientes?
11. Quem terá contas de `admin`, `cozinha` e `atendente`, e quem revisará acessos quando funcionários saírem?
12. A VPS é requisito obrigatório para banco e arquivos, ou basta hospedar o Next.js nela mantendo Supabase Cloud? Qual orçamento/rotina há para backup, atualização e suporte?

## Pontos confirmados e incertezas

Confirmado no repositório: o projeto atual é consulta local sem carrinho/pedido; usa Next.js 16, Supabase Cloud, Auth por e-mail/senha, RLS, PostgREST e três buckets públicos; não usa Realtime; somente `admin` existe no `check` de `profiles.role`; as migrations não são aplicadas automaticamente.

**Incerto:** quantidade/nome físico das mesas, volume real de dados/mídia, usuários Auth já existentes, rede/Wi‑Fi/IP do salão, modelo de impressora, processo atual de caixa e requisitos fiscais. Estes pontos não foram inferidos como fatos e precisam de resposta antes de transformar esta proposta em escopo de desenvolvimento.

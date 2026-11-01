# Rodada 3 — categorias de acesso e login por identificador

**Status:** planejamento; não autoriza implementação. **Data:** 2026-10-10.  
**Base confirmada no repositório:** `profiles.role` aceita apenas `admin`; `private.is_admin()` exige perfil ativo e protege as escritas; `requireAdmin()` repete essa regra no servidor; o login atual usa e-mail/senha no cliente; `audit_logs` aceita inserção de admin; e os buckets públicos atuais são `product-images`, `highlight-images` e `product-videos`. Não houve rede; comportamento dependente da versão/serviço Supabase está marcado como **incerto**.

## C1 — Modelo de dados

**Veredito: ACEITO.** O modelo flexível corresponde à nova decisão, desde que as invariantes não dependam da tela.

- `roles`: `id`, nome, chave de sistema opcional (`admin`/`operator`), `is_system`, `archived_at` e datas. Nomes ativos são únicos sem diferenciar maiúsculas; nomes/chaves de sistema não podem ser imitados, renomeados, arquivados ou apagados.
- `permission_catalog`: chaves fixas, descrição, área e `is_grantable`; só migration altera o catálogo. `role_permissions` referencia catálogo e categoria, com unicidade do par.
- `profiles.role_id` substitui o texto `role`, sem default administrativo e com FK restritiva. Não se atribui categoria arquivada; arquivar categoria em uso exige reatribuição na mesma transação.
- `admin` recebe implicitamente tudo. `operator` recebe implicitamente toda chave com `is_grantable = true`, inclusive futura; toda nova chave precisa declarar conscientemente se é concedível.
- Categoria personalizada recebe apenas suas linhas em `role_permissions`. O banco recusa `users.manage` e `audit.read` nessas linhas, mesmo quando o comando parte de admin; essas duas capacidades existem apenas pela categoria de sistema `admin`.
- O desenho assume uma categoria por pessoa, coerente com `profiles.role_id`; múltiplas categorias por pessoa dependem de resposta ao fim.

## C2 — Autorização na aplicação e RLS

**Veredito: ACEITO EM PARTE.** A função central é correta; o servidor não deve expor nem chamar o schema `private` diretamente pela Data API.

- `private.has_permission(chave)` será `stable`, `security definer`, `search_path = ''`, com dono mínimo, `EXECUTE` revogado de `PUBLIC`/`anon` e concedido a `authenticated`. Ela usa `auth.uid()`, exige `profiles.is_active`, categoria não arquivada e troca de senha concluída.
- Admin, Operador(a) e categoria personalizada seguem as regras de C1. Chave desconhecida resulta em `false`; autorização nunca vem de JWT, `user_metadata` ou nome enviado pelo cliente.
- Policies chamam `(select private.has_permission('...'))`. A subconsulta tende a virar initplan e evita executar a função para cada linha; manter PK de `profiles` e índice/PK em `(role_id, permission_key)`, medir com `EXPLAIN` em homologação e evitar chamadas correlacionadas.
- O servidor usa a sessão real e um wrapper estreito exposto, como “capacidade do usuário atual”, ou consulta equivalente protegida; rotas/actions não recebem um booleano confiável do navegador. `requireAdmin()` evolui para guardas por capacidade, mantendo guarda administrativa nas telas de logins, categorias de acesso e histórico.
- Alteração de permissão vale na próxima instrução/transação. Uma consulta já iniciada conserva seu snapshot, comportamento normal do Postgres.

## C3 — Granularidade do primeiro corte

**Veredito: ACEITO EM PARTE.** Dez chaves são suficientes, mas “visibilidade” não torna privados dados/buckets que hoje são públicos, e mídia também toca colunas de conteúdo.

| Chave | Proteção no estado atual |
| --- | --- |
| `catalog.read` | Leitura administrativa, inclusive inativos, de `categories` e `products`; a leitura pública ativa permanece. |
| `catalog.write` | Criar, editar, ordenar, ativar e arquivar categorias/produtos; inclui `price_cents`, disponibilidade, selo e paths do produto. |
| `media.read` | Listar `storage.objects` nos três buckets; não bloqueia a entrega por URL dos buckets públicos. |
| `media.write` | Inserir, substituir e remover objetos nos três buckets. Vincular paths exige também escrita na entidade correspondente. |
| `highlights.read` | Leitura administrativa de `highlights`, inclusive inativos. |
| `highlights.write` | Criar, editar, ordenar, ativar e arquivar destaques, inclusive seu `image_path`. |
| `store.read` | Ver a área de dados da loja; `store_settings` continua público por desenho atual. |
| `store.write` | Atualizar todos os campos de `store_settings`. |
| `users.manage` | **Reservada:** Auth, `profiles`, categorias de acesso, permissões e atribuições. |
| `audit.read` | **Reservada:** consultar `audit_logs` e sua tela. |

Preço não ganha chave própria: RLS por linha não impede alteração de uma coluna por quem pode atualizar o produto. A mesma limitação vale para `image_path`/`video_path`; no primeiro corte, escrita de conteúdo governa o vínculo e `media.write` governa o objeto. Separação rígida por coluna exigiria RPC/trigger e fica fora. `DELETE` físico cotidiano é substituído por arquivamento lógico, conforme P5.

## C4 — Login por identificador

**Veredito: ACEITO EM PARTE.** O alias sobre Supabase Auth é viável em princípio, mas precisa de homologação; e-mail sintético previsível ou acoplado ao identificador é rejeitado.

- `login_identifier` tem forma canônica no banco, unicidade sem diferenciar maiúsculas e alfabeto restrito para evitar espaços, Unicode semelhante e colisões. A criação concorrente depende da constraint, não de consulta prévia.
- O identificador aponta, em dado não exposto, para a identidade Auth. Para não quebrar login ao renomear, o e-mail interno do operador é opaco e estável (não derivado do identificador); admins mantêm e-mail real no Auth para recuperação.
- Endpoint de servidor normaliza, busca o mapeamento, autentica com o cliente público/SSR e grava a sessão; a credencial administrativa serve apenas à gestão. Aplicar limite por IP e hash do identificador, mensagem genérica e caminho de tempo semelhante para conta existente/inexistente contra enumeração.
- Senha provisória é aleatória, exibida uma vez, expira e nunca é auditada. Até a troca, banco, layout e actions liberam somente troca de senha e saída; regenerar invalida a anterior e deve revogar sessões quando a API homologada permitir.
- São **incertos** sem rede/homologação: aceitação de domínio não entregável pelo Auth, criação já confirmada, semântica de revogação e eventual envio automático de e-mail. Não usar recuperação por e-mail para conta sintética.
- Se a preocupação for apenas validação do domínio, usar subdomínio real controlado, aliases opacos e sem caixa/catch-all. Se qualquer e-mail sintético for considerado inseguro/inaceitável, a alternativa correta é um provedor de identidade com login nativo por usuário/senha; não criar tabela própria de hashes de senha na aplicação.

## C5 — Auditoria de categorias e permissões

**Veredito: ACEITO.** Mudanças de autorização são tão sensíveis quanto mudanças de preço.

- Triggers transacionais cobrem `roles`, `role_permissions` e mudança de `profiles.role_id`, além das tabelas já previstas (`categories`, `products`, `highlights`, `store_settings` e perfis).
- Evento guarda IDs e nomes das categorias anterior/nova em snapshot, ator e categoria do ator em snapshot, antes/depois e origem. Renomear uma categoria não reescreve o passado.
- Retirar inserção direta de `audit_logs` das contas da aplicação. Mudança confirmada e seu evento comprometem juntos; nova autorização aparece na próxima requisição/instrução, sem esperar renovação do JWT.

## C6 — Vários administradores

**Veredito: ACEITO EM PARTE.** A trava contra zero admins é obrigatória, mas não protege sozinha o histórico nem o estado externo do Auth.

- Serializar, na mesma transação, desativação, troca de categoria e remoção/arquivamento que possam reduzir admins; testar duas transações concorrentes. Recomenda-se manter dois ativos.
- Um admin pode desativar outro, nunca contornar a trava, e a ação gera auditoria. Desativação no banco e bloqueio/revogação no Auth não são uma transação única: o gateway precisa de ordem segura, compensação e reconciliação.
- Admin da aplicação não insere, altera, apaga nem trunca `audit_logs`; função/tabela de auditoria têm dono `NOLOGIN` separado e sem comando genérico no gateway privilegiado. Evitar apagar usuários Auth; preservar UUID e snapshots históricos.
- Dono/superusuário da VPS ainda pode adulterar banco e triggers. Cópia externa append-only/manifesto assinado é a proteção forte, mas fica fora do corte mínimo salvo exigência do responsável.

## C7 — Permissão versus escopo de mesas

**Veredito: ACEITO.** No primeiro corte, uma futura permissão de pedidos valerá para todas as mesas; atribuição por mesa pertence à ideia de pedido pela mesa.

- C1 já permite acrescentar chaves fixas sem mudar `roles`, mas não deve ganhar agora JSON/colunas de escopo sem regras de pedidos definidas.
- Reservar apenas a extensão conceitual: `has_permission` responde capacidade global; no futuro, uma função contextual recebe recurso/ID e consulta tabela normalizada de escopos, provavelmente por pessoa. Não criar uma categoria “Mesa 7” para cada mesa.

## C8 — Corte mínimo revisado e ordem

**Veredito: ACEITO EM PARTE.** O núcleo do P7 permanece, mas categorias personalizadas e login por identificador passam a ser fundação obrigatória; o conjunto total é **G**.

| Ordem | Entra | Esforço |
| --- | --- | --- |
| 1 | Fechar as perguntas abaixo e matriz das dez chaves | P |
| 2 | Catálogo de permissões, categorias de sistema/personalizadas, atribuição, arquivamento, guardas, RLS e navegação atuais | G |
| 3 | Gateway de usuários, identificador, senha provisória/troca obrigatória, admins múltiplos e trava do último admin | G |
| 4 | Auditoria transacional, imutabilidade, tela histórica básica e garantia de retenção mínima de 24 meses | G |
| 5 | Só então criar mesas/pedidos; suas chaves e escopos entram junto do domínio novo | — |

Ficam fora: convite por e-mail, múltiplas categorias por pessoa até decisão, escopo por mesa, chaves de pedidos antes das tabelas, auditoria de login/logout e objeto físico do Storage, exportação/analítica avançada, cópia externa e particionamento prematuro.

**Regressões RLS indispensáveis:**

1. `anon`, autenticado sem perfil, inativo e com senha provisória mantêm exatamente os bloqueios previstos; leitura pública atual não cresce.
2. Cada categoria personalizada lê/escreve somente as quatro áreas concedidas; testar combinações só leitura, só escrita e nenhuma, por UI, URL direta, Data API e Storage.
3. `operator` acessa toda capacidade concedível atual; `admin` acessa também as duas reservadas; categoria arquivada perde acesso imediatamente.
4. Usuário personalizado/Operador(a) não altera a própria categoria, `profiles`, `roles` ou `role_permissions` e não consegue se autoconceder nada.
5. Mesmo admin não consegue inserir `users.manage` ou `audit.read` em categoria personalizada, imitar/alterar/arquivar papel de sistema nem atribuir categoria arquivada.
6. Remover permissão bloqueia a requisição seguinte com token antigo; adicionar libera sem renovar JWT.
7. Zero admins falha inclusive sob concorrência; com dois admins, um pode desativar o outro e o evento identifica ambos.
8. Somente admin lê histórico; nenhuma conta de aplicação insere, forja, atualiza, apaga ou trunca eventos; falha do trigger reverte a mutação.
9. Triggers registram categoria/permissão/atribuição e mudanças atuais com snapshots e antes/depois corretos; SQL sem JWT não inventa ator.
10. Identificador é único sem caixa, renomear não muda a identidade Auth, respostas não enumeram contas e senha provisória não alcança o painel.

## (a) Perguntas ao responsável

1. Cada pessoa terá exatamente uma categoria ou poderá acumular várias?
2. Quem escolhe o identificador, qual formato deseja (ex.: `maria.caixa`) e o admin poderá renomeá-lo?
3. Em quanto tempo expira a senha provisória e qual canal presencial/efêmero será usado para entregá-la?
4. Permissão de alterar deve conceder automaticamente a de ver na mesma área, ou combinações “altera sem ver” precisam existir?
5. “24 meses” significa apagar ao completar o prazo ou guardar **no mínimo** 24 meses e manter por mais tempo?
6. Desativar outro admin exige apenas confirmação, nova senha do executor ou aprovação de um segundo admin?

## (b) Três maiores riscos do desenho flexível

1. **Configuração perigosa:** uma combinação errada pode expor dados ou ações; dois papéis fixos têm matriz menor e mais fácil de revisar.
2. **Explosão de testes e manutenção:** cada nova área cruza UI, servidor, RLS, Storage, auditoria e combinações de categorias.
3. **Evolução ambígua:** novas permissões ampliam automaticamente Operador(a), enquanto categorias personalizadas podem ficar incompletas; permissões globais ainda podem ser confundidas com escopo de dados.

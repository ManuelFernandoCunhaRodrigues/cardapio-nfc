# Proposta técnica — usuários do painel e rastreabilidade

**Status:** planejamento para validação; nenhuma implementação está aprovada por este documento.  
**Base analisada:** migrations e testes SQL, `lib/admin/`, `lib/supabase/`, `app/admin/`, `components/admin/`, README, proposta de pedido pela mesa e documentos indicados no vault.  
**Limite desta análise:** não houve consulta à rede. Limites comerciais do Supabase e detalhes de APIs sujeitos à versão estão marcados como **incertos** e precisam ser confirmados antes da implementação.

## A. Resumo da recomendação

1. Adotar agora dois papéis: `admin` e `operator` (rótulo sugerido: **Operador(a)**), sem reutilizar os futuros `kitchen` e `attendant` da proposta de pedido pela mesa.
2. O operador administra o catálogo e a operação diária; usuários, papéis, histórico, exportações e exclusões definitivas ficam com o administrador.
3. Criar logins por convite de e-mail é a opção recomendada; senha provisória é contingência, e link de uso único gerado pelo Auth serve quando a entrega será feita por outro canal.
4. A credencial administrativa do Supabase fica somente no servidor e atrás de um único gateway que revalida `private.is_admin()` antes de cada comando.
5. Substituir a auditoria voluntária das Server Actions por um modelo **híbrido**: triggers transacionais para dados do banco e eventos explícitos para Auth/Storage.
6. O histórico deve guardar ator, papel, instante, origem e mudanças por campo (`antes → depois`), sem senhas, tokens ou conteúdo desnecessário.
7. `audit_logs` passa a ser somente-acréscimo: sem escrita direta, `UPDATE`, `DELETE` ou `TRUNCATE` para contas da aplicação, inclusive `admin`.
8. Fazer a fundação de papéis, RLS e auditoria antes do pedido pela mesa, pois pedidos acrescentarão `kitchen`, `attendant` e muitas novas ações rastreáveis.

## B. Estado atual, com evidência

### Identidade, autorização e dados existentes

- `supabase/migrations/20261008222757_initial_schema.sql` cria `public.profiles` com `id`, `name`, `role`, `is_active`, datas, `role default 'admin'` e `check (role in ('admin'))`. Também cria `public.audit_logs` com `actor_id`, `action`, `entity`, `entity_id`, `metadata jsonb` e `created_at`; `actor_id` usa `on delete set null`.
- `supabase/migrations/20261008225427_harden_rls.sql` substitui `public.is_admin()` por `private.is_admin()`, uma função `security definer` que exige perfil do usuário atual com `role = 'admin'` e `is_active = true`. As policies administrativas de catálogo, perfis e auditoria passam a usar essa função.
- `lib/admin/require-admin.ts` faz a proteção da interface e das Server Actions: valida a sessão com `auth.getUser()`, lê a própria linha em `profiles` e exige `role === 'admin'` e `is_active`. Ele não chama diretamente `private.is_admin()`; o banco usa essa função nas policies RLS.
- `app/admin/(painel)/layout.tsx` protege todo o painel com `requireAdmin()`. `components/admin/login-form.tsx` usa `auth.signInWithPassword`; `components/admin/sign-out-button.tsx` usa `auth.signOut`.
- O README, na seção **“Promover o primeiro administrador”**, confirma o processo atual: criar a conta em **Authentication > Users**, inserir o perfil inativo por SQL e depois promover por outro `update`. Não existe trigger de promoção automática.

### Ações que já gravam em `audit_logs`

Cada linha abaixo é confirmada no `actions.ts` indicado. “Metadados” é exatamente o conteúdo específico entregue hoje à coluna `metadata`; os campos comuns `actor_id`, `action`, `entity` e `entity_id` não estão repetidos na tabela.

| Arquivo | Server Action | `action` / `entity` | Metadados atuais |
| --- | --- | --- | --- |
| `app/admin/(painel)/categorias/actions.ts` | `createCategory` | `create` / `category` | `{ name }` |
| mesmo arquivo | `updateCategory` | `update` / `category` | `{ name }` |
| mesmo arquivo | `toggleCategory` | `update` / `category` | `{ is_active }` |
| mesmo arquivo | `reorderCategory` | `reorder` / `category` | `{ direction }` |
| mesmo arquivo | `deleteCategory` | `delete` / `category` | `{}` |
| `app/admin/(painel)/produtos/actions.ts` | `createProduct` | `create` / `product` | `{ name, category_id }` |
| mesmo arquivo | `updateProduct` | `update` / `product` | `{ name, category_id }` |
| mesmo arquivo | `toggleProduct` | `update` / `product` | `{ [field]: value }`, sendo `field` `is_active` ou `is_available` |
| mesmo arquivo | `reorderProduct` | `reorder` / `product` | `{ category_id, direction }` |
| mesmo arquivo | `deleteProduct` | `delete` / `product` | `{ media_cleanup_checked: true }` |
| `app/admin/(painel)/destaques/actions.ts` | `createHighlight` | `create` / `highlight` | `{ title }` |
| mesmo arquivo | `updateHighlight` | `update` / `highlight` | `{ title }` |
| mesmo arquivo | `toggleHighlight` | `update` / `highlight` | `{ is_active }` |
| mesmo arquivo | `reorderHighlight` | `reorder` / `highlight` | `{ direction }` |
| mesmo arquivo | `deleteHighlight` | `delete` / `highlight` | `{}` |
| `app/admin/(painel)/loja/actions.ts` | `updateStoreSettings` | `update` / `store_settings` | `{ fields: Object.keys(parsed.data) }` |
| `app/admin/(painel)/midia/actions.ts` | `uploadProductImage` e `uploadHighlightImage`, por `uploadImage` | `media_image_replace` / `product` ou `highlight` | `{ bucket, image_path }` |
| mesmo arquivo | `removeProductImage` e `removeHighlightImage` | `media_image_remove` / `product` ou `highlight` | `{}` |
| mesmo arquivo | `confirmProductVideoUpload` | `media_video_replace` / `product` | `{ video_path }` |
| mesmo arquivo | `removeProductVideo` | `media_video_remove` / `product` | `{}` |

### Ações e caminhos que não gravam evento próprio

| Arquivo | Ação/caminho | O que fica sem registro próprio |
| --- | --- | --- |
| `components/admin/login-form.tsx` | `onSubmit` → `auth.signInWithPassword` | login bem-sucedido e tentativa falha; hoje só há o resultado na interface |
| `components/admin/sign-out-button.tsx` | `signOut` → `auth.signOut` | encerramento voluntário da sessão |
| `app/admin/(painel)/midia/actions.ts` | `createProductVideoUpload` | emissão da URL assinada; não altera a linha do produto e não grava auditoria |
| `components/admin/product-media-manager.tsx` | `putSignedVideo` | `PUT` direto do navegador no Storage; só a confirmação posterior por `confirmProductVideoUpload` gera o evento semântico |
| `app/admin/(painel)/midia/actions.ts` | uploads, remoções e limpezas internas em `storage.objects` | o vínculo final com produto/destaque é auditado, mas cada criação/remoção física, variante apagada, órfão e falha de limpeza não tem evento próprio |
| `app/admin/(painel)/produtos/actions.ts` | limpeza de imagem/vídeo em `deleteProduct` | existe o evento de exclusão do produto, mas não eventos separados para cada objeto removido ou falha de limpeza |
| `app/admin/(painel)/destaques/actions.ts` | limpeza de imagem em `deleteHighlight` | existe o evento de exclusão do destaque, mas não evento separado para o objeto físico |
| `lib/admin/catalog.ts` e `app/admin/(painel)/page.tsx` | listagens e contagens do painel | leituras não são auditadas; isso é aceitável se “toda ação” significar mutações e ações sensíveis |

Recuperação de senha e gestão de usuários ainda não existem no painel, portanto não há actions atuais a auditar para esses casos. Criação pelo Dashboard do Supabase e promoção por SQL também ficam fora dos arquivos da aplicação.

### Quem lê e quem insere hoje

Em `supabase/migrations/20261008225427_harden_rls.sql`:

- `anon` perde todos os privilégios sobre `profiles` e `audit_logs`;
- `authenticated` recebe apenas `SELECT` e `INSERT` em `audit_logs`;
- a policy `admin lê auditoria` permite `SELECT` somente quando `private.is_admin()` é verdadeira;
- a policy `admin insere auditoria` permite `INSERT` somente quando `private.is_admin()` é verdadeira;
- não há grant nem policy de `UPDATE` ou `DELETE` para a aplicação.

Portanto, pelo caminho normal da Data API, somente um administrador ativo lê e insere. O operador proposto não conseguiria usar os helpers atuais de auditoria sem ampliar a policy. Isso não deve ser resolvido dando `INSERT` ao operador: a recomendação da seção E é retirar a escrita direta de todos e deixar triggers controlados gravarem. Fora desse caminho, `service_role`, dono da tabela e superusuário têm poderes privilegiados e precisam de controles operacionais separados; RLS não os transforma em usuários comuns.

### Lacunas confirmadas

1. **Auditoria posterior e não atômica.** A alteração principal é concluída antes do `INSERT` do log, em outra chamada. Categorias, produtos, destaques e mídia apenas enviam a falha a `reportServerError` e ainda podem responder sucesso. Dados da loja respondem “os dados foram salvos, mas…”; também não desfazem a alteração.
2. **Um novo caminho pode esquecer a auditoria.** Não há trigger de auditoria nas migrations. Uma futura Server Action, RPC, integração ou comando SQL pode mudar dados sem criar log.
3. **O administrador pode forjar o ator.** A policy de inserção verifica apenas `private.is_admin()`; não exige `actor_id = auth.uid()`. Uma sessão admin pode inserir um evento atribuído a outro UUID.
4. **Não há `antes → depois`.** `updateProduct`, por exemplo, grava apenas nome e categoria, embora também altere descrição, preço, selo, ativo e disponibilidade. `updateStoreSettings` guarda só os nomes dos campos. Reordenações mudam duas linhas, mas criam um único evento sem os valores anteriores e novos.
5. **Exclusões perdem contexto.** Categoria e destaque excluídos usam `{}`; produto registra apenas que verificou limpeza de mídia. Não há snapshot confiável do nome ou dos demais valores excluídos. Além disso, excluir um usuário Auth torna o `actor_id` antigo `null` por causa do `on delete set null`.
6. **Storage não é integralmente descrito.** Troca/remoção do vínculo em `products` ou `highlights` é registrada, mas cada upload, remoção física, limpeza de variante e falha de limpeza não vira evento próprio. `createProductVideoUpload` somente cria a URL assinada; o `PUT` ocorre no navegador e só a confirmação posterior gera log. Um upload concluído sem confirmação pode ficar órfão e sem evento semântico.
7. **Login e logout não são registrados.** `components/admin/login-form.tsx` e `components/admin/sign-out-button.tsx` chamam o Auth diretamente no navegador. Recuperação de senha e gestão de usuários ainda não existem no painel.
8. **Ações diretas não entram no histórico da aplicação.** Criação de usuário pelo painel do Supabase, promoção por SQL, migrations e comandos manuais no banco não passam pelos helpers dos `actions.ts`.
9. **Leituras e exportações não são auditadas.** As consultas do painel em `lib/admin/catalog.ts` e no dashboard não geram eventos. Recomenda-se auditar mudanças, ações de segurança e exportação do histórico, não cada visualização cotidiana, salvo decisão diferente do responsável.
10. **Imutabilidade não cobre o dono do banco.** A aplicação não tem `UPDATE`/`DELETE`, mas o dono da tabela e um superusuário podem contornar RLS, alterar grants, desabilitar trigger ou apagar a tabela. Isso é uma limitação estrutural, não uma falha solucionável apenas por policy.

## C. Modelo de papéis

### Conjunto mínimo agora

- `admin` — responsável por segurança, contas, papéis, auditoria e exceções irreversíveis.
- `operator` — pessoa que mantém catálogo e operação diária. Rótulo recomendado na interface: **Operador(a)**.

Esse modelo não conflita com `docs/planejamento/pedido-pela-mesa-proposta-codex.md`: naquela proposta, `kitchen` vê e movimenta apenas a fila de preparo, enquanto `attendant` abre/fecha sessões de mesa e acompanha pedidos, sem editar catálogo ou preços. Portanto, não se deve chamar o novo papel de “atendente”.

Outros nomes possíveis para `operator` na interface:

1. **Operador(a)** — recomendado; descreve acesso operacional sem sugerir poder sobre usuários e segurança.
2. **Editor(a) do cardápio** — muito claro, mas fica estreito se a pessoa também controlar destaques e status da loja.
3. **Gerente** — familiar ao negócio, porém pode criar a expectativa de acesso a usuários, histórico e configurações reservadas.

### Matriz recomendada

| Recurso | Ação | `admin` | `operator` | Observação |
| --- | --- | --- | --- | --- |
| Categorias | listar ativas/inativas; criar, editar, ordenar, ativar/desativar | Sim | Sim | Operação normal do catálogo. |
| Categorias | excluir definitivamente | Sim | Não | Prefira desativação; exclusão pode quebrar relações e é irreversível. |
| Produtos | listar, criar, editar nome/descrição/categoria/selo | Sim | Sim | Atende ao uso geral do painel. |
| Preço | ver e alterar `price_cents` | Sim | Sim | Toda mudança terá antes/depois e ator. |
| Disponibilidade | alterar `is_available` e `is_active` | Sim | Sim | Ação diária e urgente; não deve depender do admin. |
| Produtos | excluir definitivamente | Sim | Não, inicialmente | “Remover do cardápio” para operador significa desativar. Se o responsável exigir exclusão física, esta célula precisa ser aprovada explicitamente. |
| Mídia | enviar, substituir e remover foto/vídeo | Sim | Sim | Inclui limpeza segura quando não há outras referências. |
| Destaques | criar, editar, ordenar, ativar/desativar e trocar mídia | Sim | Sim | Conteúdo editorial do catálogo. |
| Destaques | excluir definitivamente | Sim | Não | Mesma regra de preservação aplicada ao catálogo. |
| Dados da loja | alterar `status_override` e `notice` | Sim | Sim, por operação restrita | Útil para fechar temporariamente ou publicar aviso. A restrição por campo deve existir no banco/RPC, não só na tela. |
| Dados da loja | nome, endereço, mapa, contatos, redes e horários | Sim | Não, inicialmente | Mudanças podem redirecionar clientes ou alterar a identidade pública. |
| Usuários | convidar/criar, ativar/desativar, mudar papel, iniciar redefinição, encerrar sessões | Sim | Não | A credencial administrativa não pode ser alcançada pelo operador. |
| Histórico | consultar detalhes e exportar | Sim | Não | O pedido do responsável exige visibilidade somente do administrador. |
| Histórico | inserir manualmente, editar, excluir ou truncar | Não | Não | Eventos são gerados pelo sistema; nem o admin da aplicação altera o passado. |
| Próprio acesso | trocar a própria senha e encerrar a própria sessão | Sim | Sim | Fluxo do Auth; redefinição de terceiros continua reservada. |

Recomenda-se reservar ao administrador: usuários e papéis, consulta/exportação do histórico, exclusões definitivas e dados estáveis da loja. São operações com alto impacto, risco de ocultação de evidência, bloqueio de acesso ou fraude por redirecionamento. A disponibilidade, o aviso temporário, preço e catálogo ficam com o operador porque são tarefas diárias.

### Como evoluir sem refazer as policies

Há três caminhos:

- **`profiles.role` com `check`:** simples, explícito e coerente com o projeto atual; cada novo papel exige migration e ajuste das capacidades.
- **Tabelas de papéis/permissões:** flexíveis para permissões personalizadas, mas acrescentam joins, tela de administração e risco de configuração indevida antes de existir essa necessidade.
- **Claims no JWT:** evitam algumas consultas, porém ficam defasadas até renovar o token. Uma desativação ou rebaixamento pode não surtir efeito imediato se o JWT for a fonte de verdade.

**Caminho recomendado:** manter `profiles.role` com valores controlados no banco e centralizar todas as decisões em funções de capacidade, por exemplo `private.has_role(...)`, `private.can_manage_catalog()`, `private.can_manage_store_operation()` e `private.can_manage_users()`. As policies e o servidor chamam capacidades, não repetem comparações literais de papel. Agora o `check` aceita `admin` e `operator`; quando o pedido pela mesa entrar, acrescenta `kitchen` e `attendant` e ajusta somente as funções. Se um dia permissões personalizadas forem necessárias, as funções podem passar a consultar `role_permissions` sem reescrever todas as policies. Claims podem servir como dica de interface, nunca como autoridade final.

Também se recomenda remover o perigoso `default 'admin'` de `profiles.role`: todo perfil novo deve receber um papel explicitamente, começar inativo quando apropriado e nunca se promover pela própria linha.

## D. Criação de logins pelo painel

### Comparação das alternativas

| Alternativa | Fluxo | Exige | Riscos e trade-offs |
| --- | --- | --- | --- |
| **1. Convite por e-mail — recomendado** (`inviteUserByEmail`) | Admin informa nome, e-mail e papel; o servidor valida o admin, cria/envia o convite, cria `profiles` com o papel aprovado; a pessoa abre o link, define credenciais conforme o fluxo do Auth e entra. | Credencial administrativa somente no servidor; URL de redirecionamento permitida; SMTP e templates configurados; tratamento de criação parcial entre Auth e `profiles`. | Link pode ser encaminhado ou expirar; e-mail pode cair em spam; convite e perfil não são uma única transação. É a opção em que o admin não conhece a senha. |
| **2. Senha provisória** (`auth.admin.createUser`) | Admin informa e-mail/papel e uma senha provisória aleatória é gerada; a conta recebe `must_change_password = true`; no primeiro acesso, somente a troca de senha é permitida antes do painel. | Credencial administrativa no servidor; implementação própria do bloqueio de primeiro acesso; canal seguro para entregar a senha. SMTP não é estritamente necessário para a criação, mas é necessário/recomendado para recuperação. | Admin ou canal de entrega conhece um segredo; reutilização/cópia de senha; suporte maior. Não usar senha escolhida manualmente pelo admin nem enviar por WhatsApp em texto permanente. |
| **3. Link de cadastro de uso único** (`auth.admin.generateLink`, tipo `invite`) | Admin pede ao servidor um action link do Auth e o entrega por canal aprovado; a pessoa abre o link, define a senha e conclui o perfil. Se a semântica de uso único/expiração da versão não atender, só então considerar token próprio, guardando apenas hash, validade, criador e `used_at`. | Credencial administrativa no servidor; redirect permitido; canal seguro de entrega, validade curta e rate limit. Não exige que o SMTP do Supabase envie a mensagem, mas exige um meio confiável de entregar o link. | O link é uma credencial portadora: pode ser copiado, encaminhado, aparecer em histórico/referer ou expirar. Retorná-lo à tela do admin aumenta a chance de vazamento. Um token próprio acrescentaria corrida de uso duplo e mais código crítico. |

**Recomendação:** convite por e-mail. Senha provisória fica como contingência operacional documentada. Se for preciso entregar o convite fora do e-mail padrão, preferir primeiro o link gerado pelo Auth e confirmar em homologação uso único, expiração e redirect; não construir um sistema próprio de token enquanto esses fluxos atenderem.

O plano Free e o provedor de e-mail padrão do Supabase possuem limites/rate limits que afetam convites e recuperação. O número vigente, a política para destinatários e eventuais restrições são **incertos nesta análise**, pois mudam por plano/provedor e a consulta à rede foi proibida. Antes de implementar, confirmar no painel/documentação da versão usada. Para produção, configurar SMTP próprio, acompanhar bounces e aplicar rate limit mesmo que o volume da lanchonete seja pequeno.

### Onde fica a credencial administrativa

A API administrativa do Auth exige `service_role` ou a chave secreta equivalente da versão adotada. Ela ignora RLS e, se vazar, compromete o projeto inteiro.

- Na Vercel: variável de ambiente **somente do servidor**, por exemplo `SUPABASE_SERVICE_ROLE_KEY`/nome equivalente; nunca `NEXT_PUBLIC_*`, nunca componente cliente e nunca retorno serializado de Server Action.
- Na VPS: segredo entregue ao processo por credencial do `systemd` ou arquivo de ambiente fora do repositório, com dono do serviço e permissão mínima (por exemplo, `0600`); não colocar no bundle nem em logs.
- O cliente privilegiado deve morar em módulo marcado como servidor (`server-only`) e não ser exportado por `lib/supabase/client.ts` ou pelo cliente SSR comum.

Recomenda-se um único gateway privilegiado de gestão de usuários, com comandos validados (`invite`, `deactivate`, `change_role`, `send_recovery`, `revoke_sessions`). Para **cada** comando ele deve:

1. obter o usuário real por `auth.getUser()` usando a sessão recebida;
2. chamar, com a sessão do usuário, uma função estreita `security invoker` exposta à Data API, por exemplo `public.current_user_can_manage_users()`, cujo corpo consulta `private.is_admin()`; conceder `EXECUTE` somente a `authenticated` e não expor o schema `private`;
3. abortar antes de construir/usar o cliente privilegiado se a resposta não for verdadeira;
4. validar entrada e aplicar rate limit/idempotência;
5. executar a operação Auth, criar/atualizar `profiles` e registrar resultado com um `request_id` comum;
6. compensar falhas parciais: se Auth criar a conta e o perfil falhar, desativar/remover com cuidado a conta recém-criada ou deixá-la bloqueada e gerar alerta de reconciliação.

Uma Edge Function é alternativa válida: a chave fica em secrets da função, a função valida o JWT do chamador e consulta a capacidade administrativa antes da API Auth. Ela reduz a exposição ao runtime Next.js, mas acrescenta outro deploy, observabilidade e operação na futura instalação self-hosted. Como já existe servidor Next.js, o gateway em Server Action é o caminho mais simples; Edge Function só é preferível se o responsável quiser centralizar esse poder dentro da infraestrutura Supabase.

### Ciclo de vida da conta

- **Desativar:** não apagar a conta. Em uma operação controlada, marcar `profiles.is_active = false`, bloquear novos logins/renovações no Auth e revogar sessões/refresh tokens pela API administrativa suportada pela versão. A versão fixada no projeto (`@supabase/supabase-js` 2.57.0) expõe `ban_duration` em `updateUserById`; duração, reversão e o mecanismo recomendado para bloqueio prolongado devem ser confirmados em homologação. A interface deve sair do painel na próxima navegação.
- **Efeito imediato:** toda policy e Server Action sensível deve consultar `is_active` no banco. Assim, mesmo um access token ainda válido perde autorização. A revogação de sessões impede renovação; o access token já emitido pode existir até expirar, por isso não se deve confiar apenas no JWT.
- **Redefinir senha:** o admin inicia um e-mail/link de recuperação; ele não vê nem escolhe a nova senha. Registrar solicitação e resultado, nunca o link ou token. A assinatura exata da API deve ser confirmada na versão instalada.
- **Último administrador:** impedir em função/RPC transacional, com lock, que o último `admin` ativo seja desativado, excluído ou rebaixado. Uma contagem feita apenas na Server Action tem condição de corrida. Idealmente manter ao menos dois admins ativos, mas a regra técnica mínima é nunca chegar a zero.
- **Autoproteção:** um operador não altera `role` nem `is_active` de seu perfil. Mesmo um admin não deve rebaixar/desativar a si próprio se isso violar a regra acima; ações sobre a própria conta devem exigir confirmação reforçada.
- **Sessões:** registrar quem solicitou a desativação/revogação e o alvo. O método exato para revogar todas as sessões por usuário é **incerto até confirmar a versão da biblioteca/API**; não manipular tabelas do schema `auth` manualmente como atalho.

## E. Rastreabilidade confiável

### Comparação

| Modelo | Vantagens | Falhas/limites |
| --- | --- | --- |
| **1. Aplicação grava em cada Action** — modelo atual | Consegue usar linguagem de negócio e contexto da tela; implementação inicial simples. | Pode ser esquecida; ocorre depois da alteração; falha pode ser silenciosa; não cobre SQL, outras integrações ou novos clientes; o ator pode ser forjado se houver `INSERT` direto. |
| **2. Triggers `after insert/update/delete`** | Mesma transação da alteração; se o log falha, a mudança falha; cobre Data API, RPC e SQL; captura `OLD`/`NEW` reais. | Não vê por si só login/logout nem efeitos externos; contexto de negócio pode ser pobre; SQL manual/migration normalmente tem `auth.uid() = null`; triggers em tabelas geridas como `storage.objects` exigem teste de compatibilidade. |
| **3. Híbrido** | Triggers garantem toda mudança em dados; aplicação adiciona eventos de Auth, exportação, intenção/resultado de Storage e contexto de negócio. | Exige convenção para não duplicar eventos e reconciliação de ações externas que não podem participar da transação Postgres. |

**Recomendação: híbrido.** Os triggers são a fonte canônica de mudanças em `categories`, `products`, `highlights`, `store_settings` e `profiles`; tabelas futuras de pedidos entram no mesmo padrão. Eventos de aplicação ficam reservados a acontecimentos que não são uma linha dessas tabelas: convite, login/logout, redefinição, revogação de sessão, exportação e operação física de Storage. Os helpers genéricos atuais deixam de gravar uma segunda cópia da mesma mudança.

Isso cumpre “nenhuma ação escapa” para mutações no Postgres: o evento e a mudança confirmam ou falham juntos. Para Auth e Storage, que são serviços externos à transação, garantia absoluta atômica não existe. Nesses casos, usar eventos append-only `requested` e `succeeded`/`failed`, com `request_id`; um `requested` sem desfecho vira pendência de reconciliação. Quando compatível e suportável na versão alvo, um trigger em `storage.objects`, filtrado aos três buckets do projeto, deve capturar criação/remoção física com `auth.uid()`; se isso não for seguro para upgrades, o gateway/outbox de mídia é a alternativa.

Login e logout merecem tratamento separado. O login atual ocorre no navegador e não pode ser confirmado por trigger. A proposta é mover o fluxo sensível para um caminho de servidor que registre `login_succeeded` após o Auth, e registrar `logout_requested` antes de encerrar a sessão. Logs nativos do Auth, **se disponíveis e retidos na versão usada**, servem como fonte complementar para falhas e revogações; disponibilidade e retenção são **incertas** sem inspeção do ambiente. Não gravar senha nem e-mail digitado em tentativa falha.

### Formato do registro

Manter as colunas principais existentes, mas padronizar e, se conveniente, promover campos muito consultados a colunas próprias. Exemplo conceitual de `metadata`:

```json
{
  "schema_version": 1,
  "origin": "database_trigger",
  "actor": {
    "role": "operator",
    "name_snapshot": "Maria"
  },
  "entity_label_snapshot": "Coxinha",
  "changes": {
    "price_cents": { "before": 700, "after": 750 },
    "is_available": { "before": true, "after": false }
  },
  "request_id": "uuid-opcional"
}
```

Regras:

- **quem:** `actor_id` continua sendo o UUID canônico; guardar também papel e nome de exibição como snapshot para preservar contexto. Recomenda-se não depender de FK `on delete set null`; preferir não apagar contas e preservar o UUID histórico mesmo se a conta for removida sob procedimento excepcional;
- **quando:** `created_at` gerado no banco em UTC (`timestamptz`), nunca recebido do cliente;
- **ação:** vocabulário estável, por exemplo `insert`, `update`, `delete`, `invite_requested`, `user_deactivated`, `session_revoked`, `history_exported`;
- **entidade e id:** nomes estáveis (`product`, `category`, `profile`, `storage_object`) e `entity_id`; para `store_settings` sem UUID atual, aceitar id textual/coluna adicional ou usar chave conhecida em metadados;
- **antes/depois:** somente campos alterados; em criação, `before = null`; em exclusão, `after = null` e snapshot seguro de `OLD`. Ignorar ruído como `updated_at` quando outra mudança já identifica o evento;
- **origem:** derivada pelo servidor, não confiada ao navegador: `data_api`, `database_trigger`, `auth_gateway`, `storage`, `migration`, `manual_sql` ou `system`;
- **correlação:** `request_id` agrupa, por exemplo, troca de foto, alteração do path e remoção do objeto anterior.

Para exibição, `price_cents: 700 → 750` vira “Preço: R$ 7,00 → R$ 7,50”; o JSON continua em centavos.

### Ações sem usuário

Quando `auth.uid()` for `null`, o trigger não inventa uma pessoa. Ele grava `actor_id = null`, `database_role`/identidade técnica disponível e origem derivada. Migrations aprovadas devem definir contexto explícito e confiável na transação, como identificador da migration e executor operacional; SQL manual deve guardar `manual_sql` e a função do banco. Esse contexto só pode ser aceito de roles privilegiados, pois um cliente comum não pode escolher sua própria origem.

Uma alteração direta como dono/superusuário ainda pode desabilitar a auditoria. Para alta garantia, enviar diariamente um manifesto/hash ou cópia append-only para armazenamento externo com credencial separada. Um hash encadeado dentro do mesmo banco detecta alterações acidentais, mas não derrota um dono capaz de recalcular a cadeia.

### Somente-acréscimo

1. Revogar `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` em `audit_logs` de `anon`, `authenticated`, `service_role` e demais roles de aplicação; `TRUNCATE` precisa de revogação explícita porque RLS não o controla.
2. Remover a policy atual `admin insere auditoria`. Manter apenas `SELECT` para admin ativo.
3. Permitir inserção somente por função de trigger/gateway `security definer`, com `search_path = ''`, validação de entrada e `EXECUTE` revogado de `PUBLIC` quando ela não precisar ser chamada diretamente.
4. Não criar policies de atualização/exclusão. Opcionalmente, um trigger defensivo `before update or delete` levanta erro para qualquer role não dedicada à retenção.
5. Transferir a propriedade da tabela e das funções de escrita para uma role `NOLOGIN` dedicada, por exemplo `audit_owner`, não usada pela aplicação nem por migrations cotidianas. O `postgres`/superusuário ainda conserva poder de emergência; acesso a ele deve ser restrito e acompanhado por log externo.
6. Retenção não usa exclusão casual por linha. Particionar por período quando o volume justificar; arquivar e remover partições expiradas por job de manutenção separado, com manifesto e evento operacional.

### Retenção, volume e dados proibidos

Proposta inicial: **24 meses online**, revisão anual e arquivo opcional fora do banco por prazo aprovado pelo responsável. Para o volume esperado de uma lanchonete, começar sem particionamento, medir quantidade/tamanho e indexar `(created_at desc)`, `(actor_id, created_at desc)` e `(entity, entity_id, created_at desc)`. Avaliar partições ou arquivo quando ultrapassar, por exemplo, 100 mil registros ou quando consultas/backup mostrarem impacto; o limiar deve ser validado por medição, não tratado como limite do Postgres.

Nunca registrar: senha atual ou provisória, hash de senha, `service_role`/secret, access/refresh token, token de convite/recuperação, URL assinada completa, token de upload, cookies, corpo binário de mídia, dados de cartão ou formulário inteiro sem necessidade. E-mail/IP só entram se houver finalidade aprovada; para identificar o ator, UUID + nome/papel em snapshot bastam na maioria dos casos. Metadados devem ser construídos por lista permitida de campos, não pela serialização cega de `FormData`, `OLD` ou `NEW`.

## F. RLS e segurança

### Mudança das policies

As policies atuais repetem `private.is_admin()` para toda escrita. Com dois papéis:

- `private.has_role(allowed_roles text[])` consulta `profiles` usando `auth.uid()`, exige `is_active = true` e compara o papel;
- `private.can_manage_catalog()` aceita `admin` e `operator`;
- `private.can_manage_store_operation()` aceita ambos apenas para a operação limitada; como RLS não é boa para permissão por campo, a atualização de `status_override`/`notice` deve passar por RPC com lista de campos e a tabela não deve ficar com `UPDATE` amplo ao operador;
- `private.can_manage_users()` e a leitura de `audit_logs` aceitam somente `admin`;
- `private.is_admin()` pode permanecer como wrapper compatível, evitando quebrar tudo de uma vez;
- policies de Storage nos buckets `product-images`, `highlight-images` e `product-videos` passam de `is_admin()` para `can_manage_catalog()`;
- o layout/Server Actions deixam de usar um `requireAdmin` universal: usar `requirePanelUser`/`requireCapability`, retornando também o papel; rotas de usuários e histórico mantêm `requireAdmin`.

Todas as funções `security definer` continuam no schema `private`, com `search_path = ''`, privilégios mínimos e `EXECUTE` explícito. A UI pode esconder links, mas a autorização final permanece no banco e no gateway privilegiado.

### Regressão necessária

`supabase/tests/rls_regression.sql` possui hoje **38 verificações** para `anon`, autenticado sem perfil e admin; `supabase/tests/rls_mutation_check.sql` prova que uma policy permissiva indevida é detectada. Esses testes devem ser preservados e ampliados, não substituídos.

Casos mínimos novos:

1. `anon` mantém exatamente a leitura pública atual e não acessa painel, perfis, auditoria ou Storage administrativo.
2. autenticado sem perfil e perfil inativo não escrevem nem veem linhas administrativas.
3. `operator` ativo lê itens inativos e cria/edita/ordena/ativa catálogo, muda preço/disponibilidade e gerencia mídia.
4. `operator` não exclui entidades definitivas, não altera dados reservados da loja, não lê/exporta `audit_logs` e não insere logs manualmente.
5. `operator` não cria usuário, não chama o gateway/RPC administrativo, não altera o papel/atividade da própria linha e não se promove.
6. `admin` mantém capacidades atuais, lê o histórico e administra usuários, mas também não atualiza/exclui/trunca/forja eventos.
7. desativar/rebaixar o último admin falha sob duas transações concorrentes; criar um segundo admin permite a operação.
8. triggers geram um evento por `INSERT`/`UPDATE`/`DELETE`, com `auth.uid()`, `OLD`/`NEW` corretos; falha do log desfaz a mudança principal.
9. SQL/migration sem JWT gera ator nulo e origem técnica, sem atribuir a alteração a um funcionário.
10. upload/remoção nos três buckets respeita o papel e gera o evento definido; buckets fora da lista não são alcançáveis.
11. tentativas de ataque: atualizar `profiles.role`, chamar a API Auth como operador, consultar o histórico por URL direta/Data API e alterar/apagar auditoria resultam em negação.
12. novo teste de mutação torna deliberadamente uma policy permissiva ao operador e precisa ser detectado, como o teste atual faz com `anon`.

Testes de integração do gateway devem ainda simular criação parcial Auth/perfil, convite duplicado, rate limit, sessão revogada e falha de auditoria/reconciliação. A quantidade final será maior que 38; o número exato depende da matriz aprovada.

## G. Tela de histórico no painel — somente admin

A rota sugerida é `/admin/historico`, com item de navegação renderizado apenas para admin, proteção de servidor por `requireAdmin` e RLS como barreira final. Digitar a URL como operador deve resultar em acesso negado e a consulta direta deve retornar zero/erro conforme o desenho da policy.

Filtros:

- pessoa, com nome atual e UUID; incluir “Sistema/SQL sem usuário”;
- período, com atalhos “hoje”, “7 dias”, “30 dias” e intervalo personalizado;
- tipo de ação: criação, edição, ativação/disponibilidade, exclusão, mídia, usuários, login/sessão e exportação;
- entidade/produto: busca por nome atual, snapshot de nome ou ID; permitir filtrar categoria, destaque, loja e usuário;
- origem e resultado para investigar eventos externos pendentes/falhos.

Cada item mostra frase legível, data/hora local, ator e papel no momento. Ao expandir, exibe somente campos alterados, por exemplo:

> Maria (Operador) alterou **Coxinha** — Preço: **R$ 7,00 → R$ 7,50**; Disponibilidade: **Disponível → Indisponível**.

Campos técnicos e JSON bruto ficam numa área secundária para diagnóstico, não na leitura principal. Exclusões usam o snapshot do nome. Valores nulos aparecem como “não informado”, booleanos ganham rótulos de negócio e paths de Storage não devem dominar a tela.

Usar paginação por cursor `(created_at, id)` em ordem decrescente, inicialmente 25 ou 50 eventos, evitando `offset` em histórico crescente. A URL pode preservar filtros para investigação. Exportação CSV usa os mesmos filtros, é gerada no servidor, tem intervalo/limite para evitar consultas enormes, neutraliza fórmulas CSV e gera o evento `history_exported` sem incluir segredos.

No celular, usar cartões em linha do tempo: resumo de uma ou duas linhas, chips de pessoa/ação e detalhes recolhidos. Filtros ficam em painel/modal de tela inteira com botão “Aplicar”; período e tipo ficam acessíveis sem tabela horizontal. A comparação antes/depois usa duas linhas empilhadas, não colunas largas.

## H. Impacto na migração para VPS Ubuntu

### Se apenas o Next.js for para a VPS e o Supabase Cloud continuar

Auth Admin API, envio de e-mail, RLS, Storage e `auth.uid()` continuam no Supabase Cloud. Muda a localização da chave secreta: ela sai da Vercel e entra no mecanismo de secrets do serviço na VPS. URLs permitidas do Auth, TLS, SMTP e domínio precisam incluir a nova origem.

### Se o Supabase também for self-hosted

- **Auth Admin API:** depende do serviço Auth/GoTrue e da chave administrativa do ambiente self-hosted. O código conceitual permanece, mas chaves, URL interna, rotação e rede passam a ser responsabilidade da operação.
- **E-mail:** convite e recuperação exigem SMTP configurado no self-host. Não contar com o remetente padrão do Supabase Cloud; limites passam a ser os do provedor SMTP contratado e da configuração local.
- **`auth.uid()` em triggers:** funciona quando a alteração chega por PostgREST/Supabase com JWT e os claims são colocados na sessão do banco. Em conexão SQL direta do Next.js, migration, SQL Editor ou `psql`, normalmente será `null`; usar o tratamento de origem técnica da seção E, sem forjar UUID.
- **Storage:** os três buckets e as policies precisam ser migrados, assim como os objetos físicos. Triggers em `storage.objects`, se adotados, devem ser validados contra a versão self-hosted antes de upgrade.
- **Edge Functions:** se escolhidas para gestão de usuários, será necessário implantar e operar o runtime de Functions no conjunto self-hosted. A Server Action do Next.js reduz esse componente adicional.
- **Auditoria:** backups devem incluir `audit_logs`, roles/funções e arquivos arquivados. O backup não substitui cópia externa append-only; quem controla a VPS e o superusuário controla o banco.
- **Sessões e versões:** confirmar na versão fixada do `supabase-js`/Auth o método de revogação de todas as sessões e as assinaturas de convite/recuperação. Não depender de APIs lembradas sem teste em homologação.

O maior impacto operacional é SMTP, secrets, atualização coordenada dos serviços, backup/restauração e monitoramento. A lógica de RLS e triggers continua em Postgres e, por isso, é mais portável do que autorização baseada somente em recursos da Vercel.

## I. Fases de entrega sugeridas

| Fase | Entrega | O que é testável | Esforço |
| --- | --- | --- | --- |
| 0. Decisões | Nome do papel, matriz final, método de convite, retenção e política de exclusão aprovados | Revisão de cenários com responsável; nenhuma migration | P |
| 1. Fundação de papéis e RLS | `admin`/`operator`, funções de capacidade, proteção de rotas/actions e policies de catálogo/Storage | Regressão atual 38/38 + nova matriz; ataques de autopromoção e acesso direto | M |
| 2. Auditoria transacional | Evolução de `audit_logs`, triggers em tabelas próprias, imutabilidade, ator/origem, antes/depois e índices | Mutação + log na mesma transação; rollback quando log falha; SQL manual; tentativa de adulteração | G |
| 3. Ciclo de usuários | Gateway com segredo no servidor, convite recomendado, perfil, desativação, redefinição, regra do último admin e revogação de sessões | Convite, duplicidade, falha parcial, operador bloqueado, admin concorrente, usuário desativado com token antigo | M |
| 4. Auth/Storage e reconciliação | Eventos externos, request/outcome, Storage compatível ou outbox, login/logout e alertas de pendência | Upload sem confirmação, falha de limpeza, Auth bem-sucedido com falha posterior, reconciliação | M/G |
| 5. Histórico administrativo | Tela responsiva, filtros, antes/depois, cursor e exportação segura | Admin vê/exporta; operador não vê por UI, URL ou Data API; preço formatado; celular | M |
| 6. Operação e retenção | SMTP produtivo, alertas, backup/cópia externa, job de retenção, guia de admissão/desligamento | Restauração, expiração/arquivo controlado, troca de segredo e desligamento completo de usuário | M |

**Ordem em relação ao pedido pela mesa:** concluir ao menos as fases 0–2 antes de criar tabelas/actions de pedido. Idealmente concluir 0–5 primeiro. A proposta de pedido já prevê `kitchen` e `attendant`; a abstração de capacidades evita reescrever policies, e os triggers evitam que status, cancelamentos e sessões de mesa nasçam sem histórico. Implementar pedidos antes dessa fundação multiplicaria pontos voluntários de auditoria e exigiria uma segunda revisão ampla de RLS.

## J. Riscos e decisões que dependem do responsável

1. O nome exibido da segunda categoria será **Operador(a)** (recomendado), Editor(a) do cardápio ou Gerente?
2. O operador poderá apenas desativar produtos/categorias/destaques (recomendado) ou também excluí-los definitivamente?
3. O operador poderá mudar somente status/aviso da loja (recomendado), todos os dados da loja ou nenhum deles?
4. O fluxo principal será convite por e-mail (recomendado), senha provisória ou link próprio de uso único? Há domínio/remetente e SMTP disponíveis?
5. Pode haver mais de um administrador? O responsável aceita manter dois admins ativos e a trava absoluta contra zero admins?
6. A retenção proposta de 24 meses online atende, ou há exigência comercial/jurídica diferente? Precisa de arquivo externo após esse prazo?
7. “Toda ação” inclui apenas mudanças e ações sensíveis (recomendado) ou também toda leitura/tela aberta? Login, logout e exportação devem aparecer na mesma tela?
8. Nome e papel em snapshot bastam para identificar o ator, ou o histórico precisa mostrar e-mail — dado pessoal que aumenta o escopo de proteção?
9. A migração planejada manterá Supabase Cloud com apenas o Next.js na VPS, ou Auth/Postgres/Storage/Functions também deverão ser self-hosted?
10. O responsável aprova implementar papéis/RLS/auditoria antes do pedido pela mesa, mesmo que isso adie o início visível do fluxo de pedidos?

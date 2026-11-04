# Rodada 2 — respostas do Codex

**Status:** revisão de planejamento; não autoriza implementação.  
**Base relida:** as duas propostas da rodada 1, os pedidos registrados nos documentos 20 e 21, e os trechos pertinentes das rotas públicas, QR, variáveis de ambiente, clientes Supabase, migrations, login e ações administrativas. Não houve consulta à rede.

## P1 — Sessão aberta pelo atendente

**Veredito: ACEITO.** A crítica procede: exigir abertura prévia cria uma dependência operacional perceptível justamente no primeiro pedido, embora a equipe não transcreva os itens.

- Fluxo revisado: QR válido permite montar e enviar; sem sessão `open`, o primeiro envio cria, atomicamente, uma sessão `pending` e um pedido `pending_acceptance`. A equipe vê “Mesa 7 — aceitar?”; aceitar muda a sessão para `open` e o pedido para `new`, liberando-o à cozinha. Pedidos seguintes entram como `new` até fechamento/expiração.
- Dados/estados: `table_sessions` passa a admitir `pending`, `open`, `rejected`, `closed` e `expired`, com no máximo uma sessão `pending/open` por mesa; `orders` ganha `pending_acceptance`, e rejeição registra motivo, ator e horário. Aceite/rejeição deve ser transacional.
- O pedido pendente não entra na fila de preparo nem gera impressão. O cliente recebe “aguardando confirmação da equipe”, não uma falsa confirmação de cozinha.
- Abuso: rate limit no endpoint por IP + token + mesa, idempotência, teto de itens, uma primeira pendência por mesa, expiração curta, intervalo após rejeições e ação para revogar/rotacionar o token. Tentativas inválidas devem ser agregadas, sem guardar conteúdo excessivo.
- Risco residual: uma foto do QR pode criar pendência falsa e temporariamente atrapalhar a mesa; expiração e rejeição reduzem, mas não eliminam esse DoS. A equipe precisa confirmar visualmente ocupação/mesa antes do primeiro aceite.
- É melhor que a recomendação original para o pedido expresso: o cliente não chama o garçom e a equipe só confirma a primeira ocupação. Continua havendo um toque humano antes do primeiro preparo, como barreira contra pedido remoto.

## P2 — Acesso ao cardápio só dentro do restaurante

**Veredito: ACEITO EM PARTE.** Aceito incluir e priorizar a opção pedida; mantenho como alternativa a consulta pública porque ela ainda pode ter valor de divulgação, mas não deve ser o padrão presumido contra a preferência do responsável.

- **Padrão a apresentar:** home e rotas de cardápio só mostram produtos quando recebem token opaco de mesa válido; a URL sem token mostra apenas “Escaneie o QR da mesa”. Isso dificulta descoberta casual e indexação útil, mas é dissuasão, não prova de presença: QR fotografado continua funcionando fora.
- **Alternativa para decisão:** cardápio público e indexável, com token/sessão exigidos apenas para pedir. Favorece consulta antes da visita, compartilhamento e SEO, ao custo de contrariar a restrição literal de visualização.
- Hoje `/` e `/cardapio` carregam o menu sem token e usam `revalidate = 60`; em produção, `robots` bloqueia somente `/admin`; a RLS permite leitura `anon`. Os QRs em `docs/qr` apontam para uma URL comum. A opção restrita exige proteger também busca/detalhe, rever cache e metadados/robots e substituir os QRs comuns por um QR por mesa.
- Combinação: cada mesa recebe token aleatório longo, armazenado só como hash, validado no servidor e revogável. Rotacionar invalida a foto vazada, mas exige gerar e substituir a etiqueta física; o token não deve ir a logs, analytics ou referers de terceiros.
- Minha recomendação passa a ser **token obrigatório para visualizar como padrão**, por aderência ao pedido, e **cardápio público com pedido protegido como alternativa explícita** para o responsável escolher sabendo o que ganha e perde.

## P3 — Banco na VPS Ubuntu

**Veredito: ACEITO.** A resposta principal passa a ser Supabase self-hosted em Docker Compose na VPS, preservando Postgres, Auth/GoTrue, PostgREST/Data API e Storage para reduzir mudanças no app; Supabase Cloud fica como alternativa gerenciada.

- Manter no conjunto mínimo: Postgres, Auth, PostgREST, Storage e o gateway/proxy da API. Studio pode ficar desligado e ser aberto só em manutenção; analytics/agregação pesada de logs pode sair, preservando logs básicos; Realtime pode sair se a KDS usar polling; Edge Functions pode sair se pedidos e usuários passarem pelo servidor Next.js.
- **Mínimo realista, mas incerto sem medição:** 2 vCPU, 4 GB RAM e 40 GB SSD para uma loja, poucos acessos e conjunto enxuto; é piso apertado. Para margem de atualização, mídia e picos, planejar 4 vCPU, 8 GB RAM e 80 GB SSD. Disco final depende de mídia, logs e retenção de backups.
Cinco riscos operacionais que precisam ser aceitos:

1. A VPS vira ponto único de falha; pane, manutenção ou indisponibilidade afetam app, login, cardápio e pedidos.
2. A pessoa assume backup externo de banco **e** objetos do Storage, retenção e testes periódicos de restauração.
3. Ela assume TLS, firewall, segredos, patches do Ubuntu/containers e resposta a vulnerabilidades.
4. Upgrades coordenados do Supabase exigem versões fixas, homologação, janela, backup e rollback para evitar incompatibilidade.
5. Ela assume monitoramento de RAM/CPU/disco, logs e alertas, além de SMTP se usar convite/recuperação por e-mail.
- Supabase Cloud continua sendo alternativa se o responsável preferir menos operação; não é mais a resposta principal para este requisito.

## P4 — Um único segredo de servidor

**Veredito: ACEITO.** Uma RPC executável por `anon` permitiria contornar o rate limit do Next.js pela Data API; as duas ideias devem compartilhar a mesma fronteira privilegiada.

- O segredo administrativo do Supabase fica apenas no ambiente do processo Next.js na VPS (`systemd` credential ou arquivo fora do repositório, permissão mínima), nunca em `NEXT_PUBLIC_*`, navegador, resposta, log ou banco.
- Limite de módulos proposto: um cliente `server-only` é o único leitor do segredo; somente o gateway de gestão de usuários e o Route Handler de pedidos importam esse cliente. Demais Server Components/Actions continuam com sessão do usuário e RLS normal.
- Usuários: o gateway autentica a sessão, revalida capacidade `admin` no banco e só então chama Auth Admin para criar/desativar/redefinir/revogar.
- Pedidos: o Route Handler público valida formato/token, aplica rate limit e chama uma RPC transacional interna. Revogar `EXECUTE` dessa RPC de `PUBLIC`, `anon` e `authenticated`; concedê-lo apenas à credencial de servidor. Portanto, **não** deixar `place_table_order` executável por `anon`.
- A RPC ainda recalcula preços, valida disponibilidade, idempotência, limites e estado da sessão no banco; o endpoint não vira fonte de verdade. Vazamento da credencial continua crítico, por isso o cliente privilegiado deve ser estreito e rotacionável.
- Custo reconhecido: hoje `.env.example`, `lib/env.ts` e os três clientes Supabase usam somente URL e chave pública. Será preciso introduzir segredo, módulo privilegiado, implantação/rotação, testes de autorização e cuidado adicional de logs.

## P5 — Operador mexe em todo o sistema

**Veredito: ACEITO.** O texto do responsável é mais amplo que a matriz da rodada 1; a regra-base passa a ser operador em todo o painel, exceto gestão de usuários/logins e consulta/exportação do histórico.

| Área | `operator` | Exclusivo do `admin` |
| --- | --- | --- |
| Catálogo, preço, disponibilidade, ordem, destaques e mídia | Criar, editar, ativar, desativar e arquivar | Restaurar item arquivado |
| Dados da loja | Alterar todos os campos, inclusive identidade, endereço, contatos, horários, status e aviso | Nada adicional por padrão |
| Mesas, QR, sessões e pedidos futuros | Operar integralmente conforme regras de estado e auditoria | Nada adicional por padrão |
| Usuários/logins | Sem acesso | Criar, desativar, redefinir, trocar papel e revogar sessões |
| Histórico | Sem leitura, exportação ou escrita manual | Consultar/exportar; também não editar/apagar eventos |

- “Excluir” vira arquivamento lógico (`archived_at`, `archived_by`), some do cardápio e preserva relações, snapshots e auditoria. A limpeza física de mídia/dados sai do fluxo cotidiano; restauração pelo admin também gera evento. Isso substitui as exclusões físicas atuais de categorias/produtos/destaques.
- Recomendação opcional para o responsável decidir, não restrição assumida: reservar ao admin rotação de QR, cancelamento excepcional após preparo, dados de identidade da loja ou eliminação física após retenção. Se ele disser “operador faz tudo mesmo”, esses itens também ficam com o operador, exceto usuários e histórico.

## P6 — Senha provisória no contexto da lanchonete

**Veredito: ACEITO.** Senha provisória gerada pelo sistema passa a ser o fluxo principal; convite por e-mail fica opcional para quem tiver endereço e SMTP confiáveis.

- O servidor cria segredo aleatório forte, mostra uma única vez ao admin e não o grava em logs/auditoria. A entrega deve ser presencial ou por canal efêmero separado; o admin não escolhe uma senha previsível.
- `must_change_password` e `provisional_password_expires_at` ficam em estado autoritativo no banco. Após login, layout, Actions, gateways e RLS liberam somente a tela/operação de troca até a confirmação; esconder menus não basta.
- A flag só é removida depois de o Auth confirmar a nova senha. A nova senha precisa de política mínima, rate limit e proteção contra reutilização da provisória; sessões adicionais devem ser revogadas quando a API homologada permitir.
- Senha provisória expirada ou perdida é invalidada e regenerada pelo admin. Nunca se recupera nem se exibe novamente o valor antigo; falhas parciais entre Auth e perfil ficam bloqueadas para reconciliação.
- Cada funcionário ainda precisa de identificador único. Se não houver e-mail real, decidir por login interno compatível com o Auth (sem recuperação por e-mail) ou outro provedor; não inventar um endereço recuperável por terceiros.
- SMTP deixa de bloquear a criação de contas, mas continua necessário se o responsável quiser convite, recuperação autônoma ou avisos por e-mail na VPS.

## P7 — Corte mínimo de auditoria

**Veredito: ACEITO.** As sete fases misturaram o pedido essencial com garantias e operação avançadas; o primeiro corte deve provar autoria e antes/depois nas mudanças atuais.

- **Corte mínimo:** papéis `admin`/`operator` e capacidades/RLS; `audit_logs` com ator, papel/nome em snapshot, entidade, ação, horário e `changes`; triggers transacionais em `categories`, `products`, `highlights`, `store_settings` e `profiles`.
- Retirar os `INSERT`s voluntários das Actions para não duplicar; bloquear escrita/alteração/exclusão/truncate de `audit_logs` pelas contas da aplicação. O gateway de usuários registra criação, desativação e troca de papel sem senha/token.
- Tela `/admin/historico` somente para admin, protegida no servidor e por RLS, com lista paginada e filtros mínimos por pessoa, período, ação e entidade; mostrar claramente “Preço: antes → depois” e criação de produto.
- Testes mínimos: operador e admin geram eventos corretos; admin lê; operador/anon não leem nem forjam/apagam; falha do log reverte a mutação; SQL sem JWT aparece como origem técnica, não como funcionário.
- **Esforço relativo: G**, porque atravessa schema, triggers, RLS, todas as mutações atuais, autorização, tela e regressão, embora seja bem menor que o pacote de sete fases.
- Fica para depois: outbox/registro físico do Storage — risco aceito de upload/limpeza de arquivo não aparecer; a mudança do vínculo no produto/destaque ainda aparece.
- Login/logout — risco aceito de o histórico não reconstruir acessos e tentativas, apenas alterações efetivas.
- Particionamento e job de retenção — risco aceito de crescimento e limpeza inicialmente manual; medir volume e definir retenção antes de virar problema.
- Role `audit_owner` e cópia externa append-only — risco aceito de dono/superusuário da VPS ainda conseguir adulterar; contas normais da aplicação permanecem bloqueadas.

## Ordem recomendada das entregas

1. Fechar decisões de produto: acesso ao cardápio, primeiro aceite, papéis, arquivamento, identificador de login e retenção.
2. Preparar e homologar a VPS com Supabase self-hosted enxuto, TLS, segredo de servidor, backup externo e restauração testada.
3. Entregar `admin`/`operator`, capacidades/RLS, senha provisória, gestão de usuários e o corte mínimo de auditoria/tela histórica.
4. Criar mesas, tokens/QR por mesa, proteção de visualização e sessão `pending/open` com aceite do primeiro pedido.
5. Entregar carrinho, pedido transacional/idempotente, conta da mesa e KDS; começar com polling se Realtime estiver desligado.
6. Pilotar no salão e só então decidir Realtime, impressão, auditoria de Storage/login, retenção automatizada e endurecimento externo.

## Perguntas que o responsável precisa responder

1. O padrão aprovado é cardápio apenas com QR/token, deixando consulta pública como alternativa desligada?
2. Quem pode aceitar/rejeitar o primeiro pedido, e em quantos minutos uma pendência expira?
3. Quantas mesas existem, como são nomeadas e vários clientes/pedidos compartilham a mesma sessão até o fechamento?
4. A cozinha começará com KDS por polling, KDS com Realtime ou impressão; existe impressora e qual é o modelo/conexão?
5. Qual é a regra de cancelamento/rejeição antes e depois do início do preparo, e quem assume item já produzido?
6. “Operador(a)” é o nome aprovado e ele pode também restaurar arquivados/rotacionar QR/cancelar após preparo, ou esses itens opcionais ficam com admin?
7. Qual identificador cada funcionário usará sem e-mail real, e como a senha provisória será entregue com segurança?
8. Por quanto tempo o histórico deve ficar online e há exigência de cópia externa imutável já na primeira entrega?
9. A VPS disponível tem quantos vCPU, RAM e disco, e quem responderá por domínio/TLS, patches, alertas, backup e restauração?
10. O pagamento continua fora do sistema, e fechar a sessão apenas soma/encerra a conta ou também registra forma e valor pagos?

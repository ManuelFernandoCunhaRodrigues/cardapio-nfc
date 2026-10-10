# Épico 5 — validação posterior do Codex

Data: 2026-10-09  
Escopo: validação em leitura dos planos, resultados e artefatos produzidos pelo Claude Code. Não houve acesso a `SALGAE-STAGING`, à homologação nem execução dos scripts de homologação nesta validação.

## Veredito executivo

**AJUSTE necessário antes de considerar o Épico 5 homologado.** H1 tem evidência coerente de aprovação; H3 registrou corretamente uma reprovação (soft-404); H6 continua pendente de aparelho físico. H2 não pode ser aprovado: a evidência arquivada é anterior à correção de contraste, contém falhas de contraste e o código atual ainda contém ao menos um botão com contraste insuficiente. H5 tem boa cobertura comportamental, mas requer o teste de mutação proposto em `epico-5-plano-codex.md` para demonstrar que a suíte detecta uma policy afrouxada.

## Validação do plano e dos resultados H1–H7

| Item | Veredito | Evidência e motivo |
| --- | --- | --- |
| H1 — desempenho mobile | **APROVADO**, com ajuste operacional | O critério é determinístico: três execuções e mediana por métrica, com Performance >= 80, LCP <= 3.000 ms, CLS <= 0,1 e TBT <= 300 ms nas quatro rotas públicas. `docs/testes/lighthouse/resumo.json` contém três relatórios por rota e as medianas anotadas (home 88 / 2.856 / 0 / 254; cardápio 94 / 2.597 / 0 / 93; produto 90 / 2.615 / 0 / 288; info 98 / 2.290 / 0 / 86), todas dentro dos limites. O ajuste é de reprodutibilidade: `scripts/lighthouse-homologacao.mjs` usa `npx -y lighthouse@13.5.0`; `-y` pode buscar/instalar do registry, contrariando a restrição atual. A próxima execução deve usar uma dependência já declarada e `npx --no-install`, ou ser explicitamente autorizada fora desta restrição. |
| H2 — acessibilidade e boas práticas | **AJUSTE** | O próprio resultado inicial aponta contraste insuficiente. Isso viola a expectativa escrita no plano: “nenhum erro de contraste em preço/botões”, mesmo que a nota agregada seja 95 >= 90. A evidência arquivada confirma o problema: em todos os 15 JSONs de `docs/testes/lighthouse/`, `audits.color-contrast.score` é `0` (1, 10, 12, 1 e 2 ocorrências por execução conforme a rota). O alegado reteste pós-correção não está comprovado: `execucao.log` e todos os JSONs são de 11:10–11:16, mas o commit `06cf930` é de 11:29:04 -03:00; além disso, ele não inclui `/cardapio`, que faz parte da matriz H2. A análise estática atual ainda encontra `components/menu/product-card.tsx` com `bg-brand text-white` e o placeholder sobre `bg-surface-inner` abaixo de AA; detalhes na seção de contraste. Refazer H2 nas cinco rotas, arquivando relatórios posteriores ao commit e corrigindo as ocorrências pendentes. |
| H3 — URLs e respostas | **AJUSTE** | A matriz e o script `scripts/verificar-urls.mjs` cobrem as 15 verificações planejadas, e o resultado 13/15 é aritmeticamente consistente (6 públicas + 6 administrativas + HTTP→HTTPS passam; as 2 URLs de produto inválidas falham). A observação não foi “afrouxada”: ambas renderizam “Página não encontrada”, porém retornam 200, contrariando o esperado 404. Isto é uma reprovação real de H3, corretamente registrada, não aprovação parcial. A recomendação é corrigir o soft-404, descrita abaixo, e então repetir as 15 verificações. |
| H4 — QR Code | **AJUSTE** | `scripts/gerar-qrcode.mjs` usa `buildQrOptions()` e gera SVG/PNG; `scripts/verificar-qrcode.mjs` compara o payload decodificado em 1.024 px e após redução a 256 px. A ideia e os parâmetros M/margem 4 estão corretos e o resultado declara o payload exato. Contudo, o verificador não lê os metadados do PNG: ao fazer `sharp(file).resize(1024, 1024)`, também decodificaria um arquivo fonte menor que foi ampliado. Logo, ele prova a decodificação, mas não prova que o PNG produzido tem 1.024 x 1.024 px. Acrescentar asserção de `metadata().width/height === 1024` e preservar o teste de 256 px. |
| H5 — RLS e Storage | **AJUSTE** | A suíte é substancial: `supabase/tests/rls_regression.sql` cria fixtures em transação, alterna `anon`, usuário comum e admin, compara cada resultado com `_e` e encerra com `rollback`. A contagem confere: `_e` possui 38 linhas (14 anon, 12 usuário comum, 12 admin), portanto “38/38” é consistente com o arquivo. Ela testa resultado e SQLSTATE, não apenas ausência de exceção. Ainda falta a prova de sensibilidade: sem uma mutação que faça a suíte falhar, não é possível descartar que as verificações estejam vácuas, desconectadas da policy ou protegidas apenas por outro privilégio. O teste de mutação seguro está proposto no plano do Codex. A execução no staging declarada pelo Claude não foi reproduzida por esta validação, por restrição de escopo. |
| H6 — fluxo no celular | **APROVADO como roteiro; pendente de execução humana** | `docs/testes/epico-5-roteiro-celular.md` é adequado ao uso real: pede 4G/5G, QR, NFC opcional, navegação pública, busca, Info, login e alteração/restauração de disponibilidade no painel. O plano e a checklist não alegam que ele foi executado: o resultado H6 está marcado como aguardando responsável e a checklist marca aparelho real como pendente. Não há resultado para aprovar até receber modelo/navegador, achados e confirmação de que o item foi restaurado para “Disponível”. |
| H7 — checklist de lançamento | **AJUSTE** | `Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/12-Seguranca-e-Qualidade.md` preserva corretamente os checkboxes de produção desmarcados e separa o status de homologação. Porém, o texto do resultado “8 itens ✅ em homologação” não corresponde com precisão à tabela: há 7 linhas integralmente ✅, 2 pendentes de produção e 1 linha mista (“✅ simulado / ⏳ aparelho real”). Deve ser reescrito como 7 confirmados, 1 parcialmente validado e 2 pendentes, ou equivalente. A afirmação “produto ativo aparece; inativo não” referencia H5, que testa visibilidade RLS, não uma observação visual da UI; manter a evidência como segurança/RLS ou anexar o teste público específico. |

## Validação individual dos artefatos

| Artefato | Veredito | Evidência e motivo |
| --- | --- | --- |
| `supabase/tests/rls_regression.sql` | **AJUSTE** | O `begin`/`rollback`, fixtures isoladas, helper `pg_temp.tentar`, tabela de esperados e `RAISE EXCEPTION` tornam a regressão verificável e não persistente. Falta o teste de mutação que demonstre uma divergência esperada; ver plano do Codex. O teste de Storage verifica RLS sobre `storage.objects`; não simula upload binário, o que é aceitável se o objetivo declarado for policy/RLS. |
| `scripts/gerar-qrcode.mjs` | **APROVADO** | Normaliza a URL antes de gravar, cria `docs/qr` e usa as opções centralizadas. A geração é compatível com o objetivo H4. |
| `scripts/verificar-qrcode.mjs` | **AJUSTE** | A comparação de payload em dois tamanhos é correta, mas falta validar as dimensões intrínsecas do PNG, como descrito em H4. |
| `scripts/verificar-urls.mjs` | **APROVADO** | Usa `fetch(..., { redirect: 'manual' })`, cobre a matriz H3 e retorna código 1 em divergência. Aceita `Location` absoluto, relativo e query na tela de login. Seu resultado atual deve permanecer reprovado até a correção do soft-404. |
| `scripts/lighthouse-homologacao.mjs` | **AJUSTE** | Calcula mediana corretamente e aplica os limites planejados somente às rotas públicas para Performance/LCP/CLS/TBT; acessibilidade e boas práticas são aplicadas a todas. O uso de `npx -y lighthouse@13.5.0` não é reproduzível sem rede e não é permitido no contexto atual. Os relatórios devem registrar também hora/commit ou ser limpos antes de novo reteste para não confundir evidência anterior e posterior. |
| `lib/qr/options.ts` | **APROVADO** | `normalizeQrUrl` usa `URL`, exige `https:`, rejeita `username`/`password`, remove somente a barra de raiz sem query/hash e conserva caminho/query; `qrFileSlug` deriva host estável; `buildQrOptions` fixa M, margem 4, cores e largura padrão 1.024. Ainda não há teste unitário, coberto pelo plano proposto. |
| `docs/testes/epico-5-roteiro-celular.md` | **APROVADO como roteiro; pendente de execução** | A entrada pelo QR/NFC, 4G/5G e fluxo público/painel estão explicitados. O item 11 restaura o estado. Registrar no resultado final também se a restauração apareceu no cardápio, para fechar a reversibilidade operacional. |
| `Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/12-Seguranca-e-Qualidade.md` | **AJUSTE** | Boa separação entre homologação e produção, mas corrigir a contabilização reportada em H7 e não equiparar a consulta RLS a uma observação visual sem explicitar a distinção. |

## Avaliação da correção de contraste — commit `06cf930`

**Veredito: AJUSTE.** A direção da correção é boa e a maior parte das trocas é consistente com a nova linha da paleta, mas ela não está completa nem inteiramente consistente dentro do próprio design system.

### Cálculo independente (WCAG, luminância relativa sRGB)

| Par de cores em uso | Razão calculada | Resultado para texto normal AA |
| --- | ---: | --- |
| `#C2491A` sobre branco | 4,93:1 | passa |
| `#C2491A` sobre creme `#FAF7EF` | 4,60:1 | passa |
| `#E65F2A` sobre branco | 3,48:1 | falha |
| `#E65F2A` sobre creme `#FAF7EF` | 3,25:1 | falha |
| `#A8441B` sobre branco | 5,99:1 | passa |
| `#A8441B` sobre `#F5F0E5` | 5,27:1 | passa |
| `#A8441B` sobre `#FFE0C9` | 4,78:1 | passa |
| `#7A6E58` sobre `#F5F0E5` | 4,40:1 | falha por 0,10 |
| `#B35B37` sobre branco | 4,70:1 | passa |

Evidências no código:

- `app/globals.css` introduz `--color-brand-strong: #C2491A`, altera `positive` para `#A8441B` e `placeholder` para `#7A6E58`.
- As trocas de texto/preço, aba ativa, sidebar ativa, botão primário e chips selecionados para `text/bg-brand-strong` são coerentes com a linha “Laranja forte (texto)” de `17-Design-System-UI.md`. Para fundo forte com texto branco, 4,93:1 passa AA; o hover `bg-positive` também passa com 5,99:1 sobre branco. Não encontrei, nas mudanças de `06cf930`, troca que tenha piorado laranja sobre fundo escuro.
- Há uma falha remanescente objetiva em `components/menu/product-card.tsx`: o link de detalhe ainda usa `bg-brand text-white`. É `#E65F2A` com branco, 3,48:1, e contradiz a regra recém-adicionada de usar `#C2491A` em “fundos laranja com texto branco”.
- `components/admin/store-settings-form.tsx` e `components/ui/input.tsx` aplicam `placeholder:text-placeholder` sobre `bg-surface-inner` (`#F5F0E5`), cuja razão é 4,40:1, não os “5:1” afirmados pelo documento. Trocar para um tom ligeiramente mais escuro ou ajustar o fundo é necessário se o placeholder fizer parte do critério de texto normal.
- O banner de `app/(public)/page.tsx` mantém texto `text-cream` sobre gradiente que contém `#E65F2A` e `#FC4C0B`. Como aproximação de extremos sólidos, `#FAF7EF/#E65F2A` é 3,25:1 e `#FAF7EF/#FC4C0B` é 3,18:1. É uma hipótese visual dependente do ponto do gradiente e de imagem/overlay; não foi criada pelo commit, mas não deve ser tratada como comprovadamente acessível só porque o auditor automático não calcula todos os gradientes.
- `Salgae_Lanchonete_Obsidian/04-Design-e-Identidade-Visual/17-Design-System-UI.md` agora diz que `#C2491A` é para “todo texto laranja” e fundos laranja com texto branco, mas a tabela posterior de “Componentes-chave” ainda especifica botão primário `#E65F2A` com branco. É uma contradição documental que precisa de uma fonte única antes de encerrar a correção.

Assim, não há regressão visual óbvia causada pelo escurecimento nos componentes efetivamente trocados: a mudança mantém o laranja como cor de ação e melhora a legibilidade. Contudo, não é possível declarar “zero falhas de contraste” nem “consistência total” enquanto permanecer o botão de card, o placeholder e a ambiguidade do banner/documentação.

## Recomendação para o soft-404 de H3

**Recomendo corrigir; não aceitar como limitação.** Para URL inexistente, o status HTTP 404 é parte do contrato com navegador, cache, indexadores e monitoramento. Renderizar uma tela de erro com 200 é semanticamente incorreto.

### Proposta

1. Remover o `loading.tsx` do escopo comum que hoje engloba `/produto/[id]` e colocá-lo num route group apenas das telas públicas que podem fazer streaming sem decidir 404 (`/`, `/cardapio`, `/busca` e `/info`).
2. Para `/produto/[id]`, validar o formato UUID e consultar a existência/visibilidade do produto **antes de qualquer boundary que possa enviar bytes**. Para ID inválido ou produto ausente, chamar `notFound()` nesse caminho não-streaming; assim Next pode responder 404 de verdade.
3. Preservar feedback de navegação de produto no cliente, não no primeiro chunk do servidor: o link de produto pode iniciar um estado de transição/progresso acessível ao toque e manter a tela anterior até a resposta. Para rota válida, esse feedback começa imediatamente; para rota inválida/inexistente, o servidor ainda pode emitir o 404. O skeleton compartilhado continua nas demais rotas públicas.

Há um trade-off inevitável: não se pode simultaneamente enviar um skeleton de servidor antes da consulta de existência e depois mudar a resposta HTTP já iniciada de 200 para 404. Fazer a consulta antes do streaming é a solução correta para o status; o feedback precisa vir de uma fronteira que não comprometa os cabeçalhos (ou de UI de transição no cliente).

### Teste que comprovaria a solução

Executar em homologação, sem cookies e com `Accept: text/html`, três requisições diretas: `/produto/nao-e-uuid` e `/produto/00000000-0000-0000-0000-000000000000` devem retornar **404** e conter “Página não encontrada”; `/produto/<id-ativo-conhecido>` deve retornar **200**. Em um teste de navegação com rede deliberadamente lenta, tocar em um link de produto válido deve exibir o indicador de transição até a página carregar; navegar para URL inválida deve terminar na tela 404, não no skeleton nem em 200. O plano abaixo detalha esse caso.

## Evidência consultada

- `docs/testes/epico-5-plano-claude.md`, incluindo critérios e seção de resultados.
- `docs/testes/lighthouse/resumo.json`, os 15 JSONs de Lighthouse e `docs/testes/lighthouse/execucao.log`.
- `supabase/tests/rls_regression.sql`.
- `scripts/gerar-qrcode.mjs`, `scripts/verificar-qrcode.mjs`, `scripts/verificar-urls.mjs` e `scripts/lighthouse-homologacao.mjs`.
- `lib/qr/options.ts` e `docs/testes/epico-5-roteiro-celular.md`.
- `Salgae_Lanchonete_Obsidian/03-Entrega-e-Operacao/11-Agentes-de-IA.md`, `12-Seguranca-e-Qualidade.md` e `04-Design-e-Identidade-Visual/17-Design-System-UI.md`.
- `git show 06cf930` e as ocorrências atuais dos tokens em `app/` e `components/`.

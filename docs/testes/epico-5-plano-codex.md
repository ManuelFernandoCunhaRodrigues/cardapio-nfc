# Épico 5 — plano de testes proposto pelo Codex

Data: 2026-10-09  
Status: proposta somente. Nenhum teste deste documento foi escrito ou executado nesta validação.

## C1 — unidade: opções e normalização do QR

| Campo | Proposta |
| --- | --- |
| Objetivo | Fixar o contrato puro de `lib/qr/options.ts`, evitando QR com URL insegura, nome instável ou opções diferentes das especificadas. |
| Entrada | Criar `lib/qr/options.test.ts` com Vitest. Cobrir: `normalizeQrUrl(undefined)` retorna `DEFAULT_QR_URL`; `https://salgae-homologacao.vercel.app/` retorna a raiz sem `/` final; `https://salgae-homologacao.vercel.app/cardapio?origem=qr` preserva caminho e query; `http://...` e `ftp://...` lançam; `https://usuario:senha@host/` lança; `qrFileSlug('https://SALGAE-homologacao.vercel.app/cardapio')` retorna `salgae-homologacao-vercel-app`; `buildQrOptions()` retorna exatamente M, margem 4, largura 1024 e as duas cores exportadas; `buildQrOptions(256)` muda somente a largura. |
| Esperado | Cada entrada válida retorna a string/objeto exato. Cada esquema não HTTPS ou credencial é rejeitado. Caminho e query não são removidos; somente a raiz sem query/hash perde a barra final. |
| Por que comprova a ideia | O gerador e o decodificador compartilham estas funções. Ao testar valores e exceções diretamente, o teste detecta uma regressão antes de gerar um arquivo ou depender de câmera, Sharp ou rede. |

Observação: não propor como comportamento uma validação de largura positiva, hash ou host com porta além do que a implementação atual promete; esses casos só devem virar requisitos se houver decisão de produto correspondente.

## C2 — mutação: a suíte SQL de RLS não é vácua

| Campo | Proposta |
| --- | --- |
| Objetivo | Demonstrar que `supabase/tests/rls_regression.sql` falha quando uma policy de RLS fica permissiva por engano, e não apenas quando o banco já está no estado esperado. |
| Entrada | Em um ambiente de teste/homologação autorizado, iniciar uma única transação como `postgres`; criar temporariamente uma policy permissiva e específica, por exemplo `create policy codex_mutation_anon_reads_inactive_category on public.categories for select to anon using (true)`. Em seguida, executar o conteúdo da suíte H5 **sem o `begin`/`rollback` internos**, ainda na mesma transação. O teste-harness deve capturar a exceção esperada e fazer rollback no `finally`. Depois, numa nova transação de leitura, confirmar que `codex_mutation_anon_reads_inactive_category` não existe em `pg_policies`. |
| Esperado | A suíte deve lançar `FALHOU a regressão de RLS` e mencionar exatamente `anon.ve_categoria_inativa: esperado ok:0, obtido ok:1`. O processo do teste considera esse erro uma aprovação da mutação; após rollback, não há policy nem fixture persistente. |
| Por que comprova a ideia | A policy mutada libera exatamente a linha inativa criada pela própria suíte. Assim, a divergência não depende de suposição sobre `INSERT`/`UPDATE` grants e demonstra que a comparação `_e` × `_r` está ligada à policy que se pretende proteger. |

Não usar a cópia integral da suíte dentro de um `BEGIN` externo: PostgreSQL não possui transações aninhadas e o `rollback` final da própria suíte encerraria a transação do mutante. O harness deve retirar apenas as linhas delimitadoras `begin;` e `rollback;`, mantendo todo o corpo e suas asserções inalterados.

## C3 — integração/E2E: produto inexistente retorna 404 sem perder feedback de navegação

| Campo | Proposta |
| --- | --- |
| Objetivo | Provar a correção proposta para o soft-404: sem streaming antes da decisão de existência, 404 HTTP correto para URL inválida/inexistente e feedback perceptível para navegação a produto válido. |
| Entrada | Após a implementação proposta, usar um teste HTTP contra a build de homologação ou uma build local equivalente, sem cookies e com `Accept: text/html`: (1) `/produto/nao-e-uuid`; (2) `/produto/00000000-0000-0000-0000-000000000000`; (3) `/produto/<id-ativo-conhecido>`. Complementar com E2E de navegador em rede artificialmente lenta: tocar no card/link do produto válido e observar o indicador de transição acessível. |
| Esperado | (1) e (2) retornam status 404 e corpo com “Página não encontrada”; (3) retorna 200 e página do produto. No E2E válido, o indicador de carregamento/transição aparece após o toque e some quando o detalhe carrega. Nenhum caso inválido responde 200 com a tela 404. |
| Por que comprova a ideia | O teste HTTP verifica os cabeçalhos antes da interpretação visual do navegador, que é o defeito original. O E2E cobre o requisito separado de experiência: retirar o streaming da rota não pode deixar o toque sem feedback. |

## C4 — integração do QR: dimensão e legibilidade declaradas

| Campo | Proposta |
| --- | --- |
| Objetivo | Fechar a lacuna de H4: comprovar que o arquivo PNG não só decodifica quando redimensionado, mas nasceu em 1.024 px e continua legível a 256 px. |
| Entrada | Em diretório temporário, gerar QR com a URL de homologação pelo mesmo caminho do script; ler `sharp(file).metadata()` e decodificar o original e uma cópia 256 x 256 com `jsqr`. |
| Esperado | Metadados `width === 1024` e `height === 1024`; payload nos dois decodes é exatamente `https://salgae-homologacao.vercel.app`. |
| Por que comprova a ideia | Se o gerador perder a largura, margem, conteúdo ou capacidade prática de leitura, uma das três asserções falha. O teste continua local e não depende de câmera ou de staging. |

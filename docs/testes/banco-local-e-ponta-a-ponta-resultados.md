# Banco local no CI, testes de RLS e ponta a ponta — resultados

Data: 2026-10-13 · Ambiente: GitHub Actions, com o Supabase local (`supabase start`) criado do zero a cada execução

## O que mudou

O CI ganhou um segundo job, **banco local e ponta a ponta**, que roda a cada PR e a cada push na `develop` e na `main`:

1. Sobe o Supabase local em contêineres, com um banco vazio.
2. Aplica **todas** as migrations, na ordem, e depois `supabase/seed.sql`. É a primeira vez que as migrations rodam do zero fora do stage.
3. Gera os tipos a partir desse banco e o compilador confere se tabelas, colunas e funções são as mesmas de `lib/supabase/database.types.ts` (`npm run test:types-db`).
4. Cria um administrador de teste, com senha sorteada na hora, e roda os quatro arquivos de `supabase/tests/` (`npm run test:db`).
5. Faz o build de produção e roda os testes de ponta a ponta com o Playwright (`npm run test:e2e`).

Antes disso, os testes de RLS eram rodados à mão no stage e não existia teste que passasse pela tela.

## Testes cruzados

| Teste | Quem propôs | Quem validou a ideia | Resultado |
| --- | --- | --- | --- |
| Migrations do zero em banco vazio | Claude | Codex | 7 de 7 aplicadas, seed aplicado |
| Tipos versionados x banco das migrations | Claude | Codex | iguais; a conferência falha quando sobra coluna ou muda função (provado com um arquivo alterado de propósito) |
| `rls_regression.sql` | já existia (Épico 5) | — | 38 verificações |
| `rls_mutation_check.sql` | já existia (Épico 5) | — | a política errada plantada pelo teste foi detectada |
| `sort_order_swap.sql` | já existia (#36) | — | passou |
| `video_storage_rls.sql` | já existia (#24) | — | passou |
| Cardápio público no celular (7 testes) | Claude | Codex | 7 de 7 |
| Painel no desktop (5 testes) | Claude | Codex | 5 de 5 |

Execução de referência: job de 3 minutos; os 12 testes de ponta a ponta levam 24 segundos.

### O que os testes de ponta a ponta cobrem

**Cardápio público** (`e2e/cardapio.spec.ts`, tela de celular):

- início com categorias, mais pedidos e a aba Início marcada;
- do cardápio ao detalhe do produto e de volta, com título, descrição, endereço canônico e dados de prévia de link;
- busca por nome, termo guardado no endereço e aviso quando não acha;
- aba Info;
- 404 para produto inexistente e para identificador malformado;
- `/admin` sem sessão leva ao login; `robots.txt` bloqueia tudo e o `sitemap.xml` fica vazio fora da produção;
- cabeçalhos de segurança.

**Painel** (`e2e/painel.spec.ts`, tela de desktop, só no banco local):

- senha errada não entra;
- criar produto e vê-lo no cardápio;
- reordenar no painel e conferir a nova ordem no cardápio — é o caminho completo da função de troca atômica, que até aqui só tinha teste de banco;
- marcar "Em falta hoje" e ver o produto como indisponível;
- sair e conferir que o painel volta a exigir login.

## O que a validação do Codex mudou

- Apontou a falta de teste para os metadados do produto e para o sitemap. Os dois entraram em `e2e/cardapio.spec.ts`.
- Lembrou que as conferências no cardápio dependem de as ações do painel invalidarem o cache (`revalidatePath`). Ficou registrado aqui: se essa invalidação mudar, os testes do painel passam a falhar por até 60 segundos de atraso.
- Sugeriu abrir o menu "Mais ações" para reordenar. Não foi adotado: na tabela do desktop os botões de subir e descer ficam à vista, e o teste filtra pelos elementos visíveis.

## Defeitos encontrados no caminho

1. **Campo de situação sem nome na tabela de produtos.** O controle "Situação de <produto>" é desenhado duas vezes (cartões do celular e tabela do desktop) e usava o mesmo `id`. O rótulo da tabela apontava para o campo escondido dos cartões, e o campo visível ficava sem nome para leitor de tela. O teste do painel não achava o campo pelo rótulo. Corrigido com `useId` em `components/admin/products-manager.tsx`.
2. **`lib/supabase` fora da formatação.** O padrão `supabase` do `.prettierignore` casava em qualquer nível. Corrigido no PR dos tipos (#40).

## Não testado

- **Envio de foto e de vídeo.** O Storage local está no ar, mas nenhum teste envia arquivo.
- **Categorias, destaques e dados da loja no painel.** Só o fluxo de produto tem teste de ponta a ponta.
- **Outros navegadores.** Só Chromium.
- **Rodar tudo na máquina de desenvolvimento.** Os testes do cardápio rodaram localmente contra o stage (7 de 7). O Supabase local precisa do Docker, que não iniciou na máquina usada; por isso o job completo só foi validado no GitHub Actions.
- **Produção.** O teste de sitemap e de `robots.txt` roda como stage. O comportamento de produção está coberto por testes unitários (`lib/seo/`).

## Como rodar

```bash
npx supabase start
E2E_ADMIN_EMAIL=admin@salgae.test E2E_ADMIN_PASSWORD=<uma senha qualquer> npm run test:db
npm run build
E2E_ADMIN_EMAIL=admin@salgae.test E2E_ADMIN_PASSWORD=<a mesma senha> npm run test:e2e
```

Com o `.env.local` apontando para o Supabase local (`npx supabase status` mostra o endereço e a chave). Sem as duas variáveis de administrador, os testes do painel são pulados e os do cardápio rodam contra qualquer banco que tenha os dados do seed.

`supabase/tests/fixtures/admin_local.sql` cria um login de administrador com a senha informada. O arquivo só roda pelo `psql` e o script `scripts/testar-banco-local.sh` recusa qualquer banco que não seja local.

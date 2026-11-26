# Publicação e demonstração

O Salgaê é um sistema de demonstração para clientes. A hospedagem é gratuita (Vercel Hobby e Supabase free), sem domínio próprio, e não há lançamento comercial. Este roteiro diz como os ambientes estão montados, como uma mudança chega à produção e o que conferir antes e depois de mostrar o sistema.

**Nada aqui roda sozinho na produção.** Promoção para a `main`, migration na produção e exclusões só acontecem com o "sim" do responsável.

## Estado em 2026-11-15

- **Supabase da produção:** restaurado em 2026-11-15, depois de ser pausado pelo plano gratuito.
- **Código na produção:** a `main` está na promoção de 2026-11-04 (PR #83: API dentro do site, Next 16.4.3 e estrutura nova). O que entrou na `develop` depois disso (do #84 ao #100) ainda não foi promovido.
- **Migration pendente na produção:** `20261115120000_product_sort_order_on_category_change` está aplicada só no stage. Ela precisa chegar à produção **antes** do merge da próxima promoção.
- **Segredos do GitHub:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD_STAGE` e `SUPABASE_DB_PASSWORD_PRODUCAO` ainda não estão cadastrados. Sem eles, o workflow Migrations e a cópia semanal do banco falham de propósito e dizem o que falta.
- **Ambientes no ar:** o workflow está na `develop`. O GitHub só roda agendamentos a partir da `main`, então o ping a cada 2 dias começa a valer depois da promoção.
- **Projeto antigo da API:** o responsável excluiu o projeto Vercel `salgae-api-stage` em 2026-11-25, e os arquivos que só serviam a ele (`apps/api/src/index.ts`, `apps/api/vercel.json` e a entrada `index` do build da API) saíram do repositório.
- **Conteúdo da produção:** na conferência de 2026-11-04 (nota 16 do vault) havia itens de teste, a categoria Bebidas escondida e a página Info sem contatos. Montar o conteúdo de exemplo é a onda 6 do plano (nota 27 do vault).

## Como os ambientes estão montados

| Ambiente | Branch | Projeto Vercel | Supabase | Endereço |
| --- | --- | --- | --- | --- |
| Stage | `develop` | `salgae-homologacao` | `SALGAE-STAGING` (`csirmtmerqpbhatruzaf`) | <https://salgae-homologacao.vercel.app> |
| Produção | `main` | `salgae-producao` | `SALGAE-PRODUCTION` (`gqwtjrdfnkfitslolofg`) | <https://salgae-producao.vercel.app> |

- **Um projeto Vercel por ambiente, com a API dentro do site.** O site chama a API no mesmo processo, e ela também responde em `/api`. Não existe projeto de API separado. A decisão está em `docs/planejamento/dois-projetos-por-ambiente.md`.
- **Root Directory `apps/web`** nos dois projetos, com as funções em São Paulo (`"regions": ["gru1"]` em `apps/web/vercel.json`), perto do banco.
- **Produção só gera build de produção.** As variáveis da produção existem só nesse ambiente; uma prévia de PR com elas usaria o banco de produção.
  - O Ignored Build Step do `salgae-producao` é `echo "Ignored Build Step: VERCEL_ENV=$VERCEL_ENV"; test "$VERCEL_ENV" != "production"`. Trocado em 2026-11-26.
  - O comando anterior, `[ "$VERCEL_ENV" != "production" ]`, é igual ao modelo "Only build production" da Vercel. Com ele, as prévias rodavam a regra dentro do build e eram canceladas, como deve ser. Os deploys de produção pelo Git, porém, eram cancelados antes de qualquer build. Por isso a `main` não chegava ao ar desde 2026-10-15, e as publicações de 2026-11-04 e 2026-11-26 precisaram de redeploy manual.
  - O comando novo faz a mesma conta, mas roda dentro do build e deixa no log o valor de `VERCEL_ENV`. A primeira promoção depois da troca confirma se a `main` passa a publicar sozinha.
  - **Cancelado também conta.** No plano Hobby, cada deploy cancelado entra na cota de 100 deploys por dia da conta. Cada push numa branch com PR gera um deploy em cada projeto da Vercel.
- **Conferir a publicação na Vercel, não só no GitHub.** O status "Vercel – salgae-producao" do GitHub aparece como `success` mesmo quando a descrição diz "Canceled by Ignored Build Step". Depois do merge na `main`, confirmar no painel da Vercel (ou com `vercel ls salgae-producao`) que o deploy de produção ficou **Ready**. Confirmar também que o site mostra algo que só existe no código novo.
- **Se o deploy de produção for cancelado:** fazer um redeploy dele pelo painel da Vercel, ou rodar `vercel redeploy <id do deploy> --target production`. O redeploy roda a regra dentro do build e publica.
- **Variáveis de cada projeto:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_SITE_ENV` (`production` só na produção; sem ela, o site bloqueia buscadores). Nenhuma `service_role`. `API_URL` e `WEB_ORIGIN` não são usadas na Vercel.
- **O build lê o banco.** As páginas públicas são geradas com os dados do Supabase. Se o banco estiver pausado, o deploy falha e o site continua na versão anterior.
- **`/api/health`** consulta o banco e responde `{"status":"ok"}` com 200, ou 503 quando o banco não responde.

## Workflows do GitHub e segredos

| Workflow | Quando roda | Segredos |
| --- | --- | --- |
| **CI** (`ci.yml`) | PR e push na `develop` e na `main` | Nenhum. Usa o Supabase local criado no próprio job. |
| **Migrations** (`migrations.yml`) | Push na `develop` ou na `main` que mude migrations (aplica); PR para a `main` (só confere a produção); "Run workflow" com ambiente `stage` ou `producao` | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD_STAGE`, `SUPABASE_DB_PASSWORD_PRODUCAO`. Sem eles, falha. |
| **Ambientes no ar** (`ambientes-no-ar.yml`) | A cada 2 dias, ping no `/api/health` do stage e da produção; aos domingos, cópia do banco da produção (artefato por 30 dias); também à mão | O ping não usa segredo. A cópia usa `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD_PRODUCAO`. |

Os segredos ficam em Settings > Secrets and variables > Actions, e quem cadastra é o responsável. O passo a passo das migrations, inclusive o acerto único do histórico da produção, está em [Migrations pelo CI](migrations-pelo-ci.md).

## Como uma mudança chega à produção

1. PR para a `develop`, com o CI verde. O merge publica o stage.
2. Conferir no stage o que mudou, no celular e no computador.
3. **Se houver migration nova,** aplicá-la na produção antes do merge na `main`:
   - com os segredos cadastrados: Actions > Migrations > Run workflow, branch `develop`, ambiente `producao`;
   - sem os segredos: à mão, depois de uma cópia do banco.

   ```bash
   npx supabase login
   npx supabase link --project-ref gqwtjrdfnkfitslolofg
   npx supabase db dump -f copia-esquema.sql
   npx supabase db dump --data-only -f copia-dados.sql
   npx supabase db push
   ```

   A migration precisa funcionar com o código que ainda está na produção, porque o banco muda antes.
4. PR de promoção `develop` → `main`, com o "sim" do responsável. O merge publica a produção.
5. Fazer a conferência de "Antes de uma demonstração" na produção.

**Não** execute `supabase/seed.sql` na produção. O primeiro administrador é criado como está no `README.md` ("Primeiro administrador").

## Antes de uma demonstração

De preferência na véspera, porque reativar o banco leva alguns minutos.

- [ ] **Supabase da produção ativo.** No painel do Supabase, se `SALGAE-PRODUCTION` estiver pausado, restaurar o projeto.
- [ ] **`https://salgae-producao.vercel.app/api/health`** responde `{"status":"ok"}`.
- [ ] **`/cardapio`** abre com fotos e preços, e nenhum item de teste aparece. Conferir também a Início, um produto com vídeo e a Info.
- [ ] **Painel:** entrar em `/admin/login` com a conta de administrador da produção e abrir o Resumo, Produtos e Loja.
- [ ] **Loja** em **Seguir os horários abaixo**, sem abertura ou fechamento manual esquecido.
- [ ] **QR Code** (`docs/qr/salgae-producao-vercel-app.png`) abre o cardápio pela câmera do celular.
- [ ] Abrir o cardápio num celular com rede móvel.

## Durante a demonstração

Uma ordem que mostra o sistema inteiro:

1. **Cliente:** QR Code → Início (destaques e categorias) → Cardápio → produto com vídeo → Busca → Info.
2. **Painel:** mudar o preço de um produto e ver no cardápio; marcar um item como **Em falta hoje**; esconder e mostrar uma categoria; fechar e abrir a loja pela pílula do topo.

Anote cada alteração, para desfazer depois. No editor de produto, não use o botão Voltar do navegador: ele não pergunta antes de descartar o que não foi salvo (limite conhecido).

## Depois da demonstração

- [ ] Desfazer o que foi alterado: preços, situações, categorias e destaques.
- [ ] Apagar o que foi criado só para mostrar.
- [ ] Voltar a Loja para **Seguir os horários abaixo**.
- [ ] Conferir `/cardapio` de novo.
- [ ] Sair do painel no aparelho usado.

## O que não se aplica à demonstração

Itens do roteiro antigo de lançamento que não valem para este propósito:

- plano pago da Vercel ou do Supabase;
- domínio próprio;
- gravação e trava de tags NFC no estabelecimento;
- orientação de uma equipe de loja real (o `docs/guia-da-equipe.md` serve como material para o cliente).

## Se algo der errado

- **Código:** na Vercel, Deployments → promover o deploy anterior estável. Depois, reverter o PR no Git e sincronizar a `develop`.
- **Banco:** o plano gratuito não tem backup diário. A cópia semanal do workflow Ambientes no ar só existe com os segredos cadastrados e o workflow na `main`; até lá, fazer a cópia à mão (comandos acima) antes de qualquer mudança no banco da produção. Migrations não têm "desfazer" automático.
- **Fotos e vídeos** do Storage não entram na cópia do banco.

## QR Code

O QR da produção está em `docs/qr/salgae-producao-vercel-app.png` e `.svg`. Para gerar de novo:

```bash
npm run qr:gerar -- https://salgae-producao.vercel.app
npm run qr:verificar -- https://salgae-producao.vercel.app
```

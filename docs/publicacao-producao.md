# Roteiro de publicação em produção (Épico 6)

Sequência para colocar o cardápio no ar pela primeira vez. Cada passo tem dono e critério de conferência. **Nada aqui roda sozinho**: produção só é tocada com autorização explícita do responsável.

Estado em 2026-10-10 (fim do dia):

- **Banco:** `SALGAE-PRODUCTION` (`gqwtjrdfnkfitslolofg`) com as 5 migrations aplicadas, versões iguais às do repositório, e conferido contra a homologação por hash (colunas, 28 políticas, funções, restrições, permissões, buckets, índices, gatilhos e RLS idênticos). Advisors de segurança sem avisos. Sem dados além do registro padrão da loja.
- **Código:** `main` recebeu a primeira promoção (PR #11).
- **Vercel:** projeto `salgae-producao` conectado ao repositório, com as quatro variáveis de produção. Primeiro deploy de produção em 2026-10-10 (PR #13 + republicação após corrigir a chave publicável).
- **No ar:** `https://salgae-producao.vercel.app`. Conferido após o deploy: todas as rotas públicas 200; `/admin` redireciona para o login; `robots.txt` com `Disallow: /admin` e home indexável; login `noindex`; os cinco cabeçalhos de segurança (HSTS sob HTTPS); cardápio lendo o banco de produção sem erros no log; QR Code em `docs/qr/salgae-producao-vercel-app.*` verificado.
- **Pendente:** primeiro administrador, conteúdo real (o banco só tem o registro padrão da loja), teste em celular real, decisão do plano da Vercel e trocar a Production Branch do projeto `salgae-homologacao` para `develop`.

## 0. Pré-requisitos (decisões do responsável)

- [ ] Épico 5 mergeado na `develop` (H6 feito ou exceção registrada).
- [ ] Plano da Vercel definido — o Hobby não permite uso comercial.
- [ ] Endereço público definido (domínio próprio ou `*.vercel.app`). É o que vai gravado nas tags NFC e impresso nos QR Codes.
- [ ] Plano do Supabase de produção definido (Free pausa após ~7 dias sem atividade).
- [ ] E-mail(s) do administrador de produção.
- [ ] Conteúdo real disponível: cardápio, preços, fotos e dados da loja.

## 1. Banco de produção

1. Aplicar as migrations de `supabase/migrations/` **na ordem**, as mesmas já validadas em homologação:
   - `20261008222757_initial_schema`
   - `20261008225427_harden_rls`
   - `20261008232020_store_settings`
   - `20261009103822_product_badge`
   - `20261009121148_media_storage`
   - mais as que entrarem até a data da publicação.
2. **Não** executar `supabase/seed.sql` em produção.
3. Conferir: lista de migrations igual à de homologação; advisors de segurança sem erro; buckets `product-images`, `highlight-images` e `product-videos` criados.
4. Rodar `supabase/tests/rls_regression.sql` (somente leitura/transação revertida) e comparar com o resultado de homologação.

## 2. Primeiro administrador

Seguir "Promover o primeiro administrador" do `README.md`: criar o usuário em Authentication, criar o perfil inativo e só então promovê-lo. Não há promoção automática.

Em Authentication, conferir também: cadastro público desativado, Site URL e Redirect URLs apontando para o endereço de produção.

## 3. Projeto Vercel de produção

1. Criar o projeto ligado ao mesmo repositório, com **Production Branch = `main`**.
2. Variáveis (somente as de produção):
   - `NEXT_PUBLIC_SUPABASE_URL=https://gqwtjrdfnkfitslolofg.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave publicável de produção>`
   - `NEXT_PUBLIC_SITE_ENV=production`
   - `NEXT_PUBLIC_SITE_URL=<endereço público>`
3. Nenhuma `service_role` em variável `NEXT_PUBLIC_`.
4. No projeto de homologação: Production Branch = `develop` e `NEXT_PUBLIC_SITE_ENV=staging` (ou ausente).

## 4. Promoção do código

1. PR `develop` → `main`, com lint, typecheck, testes e build verdes no CI.
2. Merge publica a produção.
3. Se houver domínio próprio: adicionar na Vercel, configurar DNS e aguardar o certificado HTTPS.

## 5. Conteúdo

Cadastrar pelo painel de produção: dados da loja e horários, categorias, produtos com foto, destaques. Conferir no celular que nenhum item de teste ficou visível.

## 6. NFC e QR Code

1. Gerar o QR de produção: `npm run qr:gerar -- <endereço público>` e conferir com `npm run qr:verificar`.
2. Gravar as tags (NTAG213/215) com a URL de produção pelo app *NFC Tools* e **travar a gravação** só depois de testar.
3. Testar cada tag e cada QR impresso com pelo menos dois celulares (Android e iPhone).

## 7. Checklist pós-publicação

Repetir em produção o checklist de `12-Seguranca-e-Qualidade` (vault):

- [ ] URL NFC e QR Code apontam para produção.
- [ ] Produção usa somente credenciais de produção.
- [ ] Administrador entra; visitante é redirecionado de `/admin` para o login.
- [ ] Produto ativo aparece; inativo não.
- [ ] Indisponível aparece esmaecido com selo.
- [ ] Troca de foto não quebra o cardápio.
- [ ] Vídeo só carrega no detalhe, sem som.
- [ ] Cardápio abre bem no celular com rede móvel.
- [ ] `robots.txt` de produção permite o cardápio e bloqueia `/admin`; o de homologação bloqueia tudo.

## 8. Rollback

- **Código:** na Vercel, promover o deploy anterior estável (Deployments → Promote to Production) e depois reverter o PR no Git.
- **Backup:** no plano Free do Supabase não há backup diário automático; até mudar de plano, o backup é manual (`pg_dump`) e deve entrar na rotina técnica.
- **Banco:** migrations não têm "desfazer" automático. Antes de qualquer migration em produção com dados reais, fazer backup (`pg_dump` ou backup do painel) e ter o SQL de reversão revisado.
- Toda correção de urgência entra pelo Git e é sincronizada com a `develop`.

## 9. Orientação da equipe

Entregar e percorrer com a equipe o `docs/guia-da-equipe.md`, substituindo o endereço do painel pelo de produção.

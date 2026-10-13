# Salgaê Lanchonete

Fundação do cardápio digital **local/presencial** da Salgaê Lanchonete. Este repositório não inclui delivery, carrinho, checkout ou pagamento.

## Requisitos

- Node.js 22 ou superior
- npm
- Um projeto Supabase configurado para o ambiente desejado

## Executar localmente

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha em `.env.local` a URL e a chave anônima/publicável do Supabase. A aplicação valida essas variáveis ao acessar recursos que dependem do Supabase e informa claramente quando estiverem ausentes ou inválidas.

- Homologação (SALGAE-STAGING): `https://csirmtmerqpbhatruzaf.supabase.co`
- Produção: `https://gqwtjrdfnkfitslolofg.supabase.co`

Não use nem exponha `service_role`: ela não é necessária neste épico e nunca deve ir para variáveis `NEXT_PUBLIC_`.

## Scripts

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o ambiente de desenvolvimento. |
| `npm run build` | Gera o build de produção. |
| `npm run start` | Inicia o build de produção. |
| `npm run lint` | Executa o ESLint. |
| `npm run typecheck` | Valida o TypeScript estrito sem emitir arquivos. |
| `npm test` | Executa os testes unitários com Vitest. |

## Banco de dados e migrations

As migrations ficam em `supabase/migrations/` e **não são aplicadas automaticamente**. Revise sempre a migration antes de aplicá-la no ambiente correspondente.

Exemplo usando a CLI do Supabase, com o projeto de homologação vinculado:

```bash
npx supabase login
npx supabase link --project-ref csirmtmerqpbhatruzaf
npx supabase db push
```

Para dados de exemplo, use `supabase/seed.sql` somente em ambiente local ou de homologação. Não execute o seed em produção.

Os dados únicos da loja são criados pela migration `20261008232020_store_settings.sql`. Administradores ativos podem editá-los em `/admin/loja`; visitantes apenas os leem para a futura aba Info e para o status aberto/fechado.

A migration `20261009103822_product_badge.sql` acrescenta `products.badge`, usado para os selos públicos `MAIS PEDIDO`, `NOVO` e `QUENTINHO`.

A migration `20261009121148_media_storage.sql` cria os buckets públicos `product-images`, `highlight-images` e `product-videos` com suas políticas de Storage. Ela também **não é aplicada automaticamente**. Revise-a e aplique primeiro em homologação.

A migration `20261011003026_video_compression_storage.sql` cria o bucket **privado** `product-video-uploads` (vídeo bruto, até 50 MB, apagado depois da compactação) e restringe o bucket público `product-videos` a MP4 de até 4 MB. Aplique-a antes de publicar o código que compacta vídeos, primeiro em stage.

## Mídia (Épico 4)

O painel reduz a foto no navegador (orientação EXIF aplicada, maior lado de até 2048 px e JPEG 0,92) e o servidor a valida pelo conteúdo com `sharp`. Fotos válidas têm pelo menos 400 px no menor lado e até 15 MB antes da redução. O servidor remove metadados, aplica a rotação EXIF e gera WebP `detail` (até 1600 px, meta de 300 KB) e `card` (até 640 px, meta de 80 KB). A qualidade tenta 82, 76 e 70; nunca fica abaixo de 70.

O banco guarda a base do caminho, por exemplo `products/<id>/<uuid>`, e a interface escolhe `-card.webp` ou `-detail.webp`; caminhos legados com extensão continuam funcionando. Na troca, as duas variantes novas são enviadas e o registro é atualizado antes de apagar a mídia anterior, somente quando não há outra referência.

A ação de servidor aceita até 16 MB para acomodar a validação de foto já reduzida no cliente.

### Vídeo do produto (compactação automática)

Todo vídeo enviado pelo painel é **compactado no servidor** antes de ser publicado. O cliente sempre recebe um arquivo leve, igual para qualquer celular que tenha gravado o original.

| | Entrada (o que o painel aceita) | Saída (o que o cliente baixa) |
| --- | --- | --- |
| Formato | MP4, MOV (iPhone) ou WebM; H.264, HEVC, VP9… | MP4 H.264 (High, nível 3.1), 8 bits |
| Tamanho | até 50 MB | até ~3 MB para 15 s (teto de 4 MB) |
| Duração | até 15 s (tolerância de 0,5 s) | a mesma |
| Resolução | até 4K | cabe em 1280×720 ou 720×1280, sem ampliar |
| Quadros | qualquer | no máximo 30 por segundo |
| Áudio | qualquer | removido (o vídeo toca mudo) |
| Extras | HDR, rotação, GPS do celular | convertido para SDR, rotação aplicada, metadados removidos, `faststart` (começa a tocar antes de baixar tudo) |

Como funciona:

1. o navegador valida tipo, tamanho e duração e envia o bruto direto ao bucket privado `product-video-uploads` por URL assinada (com barra de progresso);
2. a rota `POST /admin/midia/video` (Node, só administrador ativo, mesma origem) baixa o bruto, confere o tipo real pela assinatura do arquivo, compacta com `ffmpeg`, confere a saída e a envia para `product-videos`;
3. `products.video_path` só é atualizado depois que o arquivo novo está publicado; o vídeo anterior é apagado em seguida;
4. o bruto e os arquivos temporários são apagados sempre, com sucesso ou erro. Se a compactação falhar ou demorar demais, o produto fica como estava e o painel mostra uma mensagem clara.

A foto continua obrigatória: é a capa e o fallback. Vídeos já publicados antes desta regra continuam funcionando; para deixá-los leves, basta reenviá-los pelo painel.

O `ffmpeg` vem do pacote `ffmpeg-static` (baixado no `npm install`/`npm ci` para o sistema da máquina) e roda como programa separado; o binário é distribuído sob GPL. Em um servidor próprio (VPS) também é possível usar o ffmpeg do sistema: `sudo apt install ffmpeg` e definir `FFMPEG_PATH=/usr/bin/ffmpeg`. Na Vercel, `next.config.ts` inclui o binário no pacote da rota (`outputFileTracingIncludes`) e a rota declara `maxDuration = 180`.

## Painel administrativo

Depois de promover um administrador ativo, o painel fica disponível nestas rotas:

- `/admin` — resumo do catálogo;
- `/admin/produtos` — busca, filtros, disponibilidade, ativo/inativo e ordenação;
- `/admin/produtos/novo` e `/admin/produtos/[id]` — criação e edição com prévia do cardápio;
- `/admin/categorias` — criação, edição, status e ordenação;
- `/admin/loja` — dados e horários da loja.
- `/admin/destaques` — banners, destinos, imagem, status e ordenação.

As ações do painel exigem um perfil `admin` ativo tanto na aplicação quanto no RLS. Categorias com produtos vinculados não podem ser excluídas: mova os produtos para outra categoria ou desative a categoria. No celular, os formulários de produto e destaque mantêm a ação Salvar fixa acima da área segura inferior.

## Rotas públicas

- `/` — início, destaques, categorias e mais pedidos.
- `/cardapio` — lista completa por categoria.
- `/produto/[id]` — detalhe do item, com vídeo opcional sob demanda.
- `/busca` — busca local por nome ou ingrediente.
- `/info` — situação da loja, horários e contatos configurados no painel.

O cardápio é somente de consulta: **"Consulta apenas. Faça seu pedido com o atendente."**

### Promover o primeiro administrador

1. Crie o usuário em **Authentication > Users** no Supabase.
2. Pelo SQL Editor, como responsável autorizado, crie o perfil se ele ainda não existir e mantenha-o inativo até a promoção:

```sql
insert into public.profiles (id, name, role, is_active)
values ('UUID_DO_USUARIO', 'Nome do responsável', 'admin', false)
on conflict (id) do nothing;
```

3. Depois da conferência do responsável, promova-o manualmente:

```sql
update public.profiles
set role = 'admin', is_active = true
where id = 'UUID_DO_USUARIO';
```

Não há trigger para promover automaticamente nenhum usuário. A autorização é conferida no banco por RLS e pela função interna `private.is_admin()`, que não é exposta pela Data API.

## Fluxo de ambientes

- desenvolvimento → a máquina de quem programa (`npm run dev`), apontando para o banco de stage
- `develop` → stage, antes chamado de homologação (SALGAE-STAGING + projeto Vercel `salgae-homologacao`)
- `main` → produção (SALGAE-PRODUCTION + projeto Vercel `salgae-producao`)

Antes de promover, execute lint, typecheck, testes e build. Migrations devem ser aplicadas primeiro em homologação e somente depois, revisadas, em produção.

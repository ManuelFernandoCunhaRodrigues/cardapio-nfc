---
titulo: "Segurança e qualidade"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-11-16
---
# Segurança e qualidade

Voltar: [[00-Comece-Aqui]] · Dados: [[07-Modelo-de-Dados-Supabase]]

## Controles mínimos de segurança

- Usar HTTPS em homologação e produção.
- Manter RLS ativo e revisado nas tabelas do Supabase expostas à aplicação.
- Garantir que operações de criar, editar, apagar e enviar imagens e vídeos dependam de sessão e papel autorizado.
- Aplicar rate limiting especialmente em login, recuperação de conta e endpoints administrativos.
- Validar e normalizar todo dado recebido; não confiar somente no formulário.
- Tratar upload de imagem e vídeo por tipo real, tamanho, duração e permissão.
- Guardar segredos apenas nas variáveis privadas do ambiente.
- Não expor service role, tokens ou dados administrativos no frontend.
- Registrar erros de forma segura, sem devolver detalhes internos ao visitante.
- Fazer backup e testar como restaurar dados importantes.

## Qualidade de produto

- Layout responsivo e testado principalmente no celular.
- Navegação por teclado e contraste suficiente onde aplicável.
- Textos claros, preços visíveis e feedback após salvar.
- Estados de carregamento, vazio e erro em telas públicas e administrativas.
- Proteção contra clique duplicado em operações de gravação.
- Não apagar imagem ou dado antes de confirmar a troca/transação.
- Toda requisição à API tem tempo limite de 15 segundos (o processamento de vídeo tem um orçamento próprio, maior). Se a leitura pública falhar ou estourar o tempo, o site lança o erro em vez de publicar uma tela de erro: no build a publicação falha, e na revalidação o Next mantém a última versão boa. O CI derruba o banco de propósito no fim para conferir isso. (Em 2026-10-13, uma lentidão derrubou um deploy do stage por falta de tempo limite.)

## Verificações antes de merge

| Verificação | Obrigatória quando aplicável |
| --- | --- |
| Formatação (Prettier, `npm run format:check`) | Sim |
| Lint | Sim |
| Typecheck | Sim, se a aplicação usar TypeScript |
| Arquivos, exports e dependências sem uso (`npm run knip`) | Sim, roda no CI |
| Falhas conhecidas nas dependências de produção (`npm audit --omit=dev --audit-level=moderate`) | Sim, roda no CI desde o PR #88 |
| Testes automatizados com piso de cobertura (`npm run test:coverage`) | Para regras de negócio, acesso e regressões críticas |
| Migrations do zero, testes SQL e ponta a ponta (job "banco local e ponta a ponta" do CI) | Sim, roda sozinho em todo PR |
| Build de produção | Sim |
| Teste manual em celular | Sim, para alteração de interface pública |
| Revisão de permissões/RLS | Para tabelas, Storage, Auth ou painel |

## CI, audit, cobertura e E2E (2026-11-16)

- **CI** (`.github/workflows/ci.yml`), em todo PR e push na `develop` e na `main`, em dois jobs:
  - `verify`: formatação, lint, typecheck, `knip`, `npm audit` das dependências de produção, testes com cobertura (com resumo no job) e build da API.
  - `banco local e ponta a ponta`: sobe o Supabase local, aplica todas as migrations num banco vazio, confere os tipos versionados, roda os testes SQL (RLS, Storage, reordenação, auditoria, slug e troca de categoria), faz o build do site, roda o Playwright, sobe a imagem Docker da API e confere o `/health`, e por último derruba o banco para provar que o cardápio continua no ar.
- **Pisos de cobertura** (instruções/ramos/funções/linhas): API 70/65/75/70, site 51/49/65/52, core 52/51/68/53. Na revisão de 2026-11-15 o valor real estava de 12 a 19 pontos acima. Subir os pisos para perto do real é da onda 5 e continua pendente.
- **E2E** (`e2e/`): cardápio no celular e no computador, painel (produtos, situações, categorias, destaques, loja), foto e vídeo, cache, cliques repetidos, sessão expirada, acessibilidade com axe e movimento reduzido, mais as rotas da API. A CSP é conferida em todo teste. Fora do CI, o Playwright se recusa a rodar contra um Supabase que não seja local, salvo com `E2E_ALLOW_REMOTE_SUPABASE=1` (PR #93). Passo a passo no `README.md`.
- **Pendências de teste conhecidas** (onda 5): um `test.skip` esconde a gaveta do destaque encoberta no Pixel 7 (`e2e/movimento/movimento-painel.spec.ts`); ainda há esperas fixas (`waitForTimeout`) e um `networkidle` em testes do painel; não há testes de componente no `apps/web`.
- **Imagem Docker da API** roda com o usuário `node` e ignora arquivos `.env` (PR #88).

## Checklist de lançamento

> Para a demonstração, o checklist que vale é o de `docs/publicacao-producao.md` (antes, durante e depois de demonstrar). Os itens de NFC e de rede móvel continuam úteis; plano pago e domínio não se aplicam.

- [ ] URL NFC e QR Code apontam para produção, não homologação.
- [ ] Ambiente de produção usa somente credenciais de produção.
- [ ] Administrador consegue entrar e visitante não acessa o painel.
- [ ] Produto ativo aparece; produto inativo não aparece.
- [ ] Indisponibilidade segue o comportamento definido.
- [ ] Substituição de foto não quebra o cardápio nem acumula arquivo órfão.
- [ ] Vídeo de produto só carrega no detalhe, toca sem som e, se falhar, a foto continua visível.
- [ ] Cardápio abre bem em celular com rede móvel.
- [ ] Erros de formulário são compreensíveis.
- [ ] Há procedimento conhecido para rollback.

### Status em homologação (2026-10-09)

Verificado em `https://salgae-homologacao.vercel.app` + `SALGAE-STAGING` (Épico 5). Evidências em `docs/testes/epico-4-*.md` e `docs/testes/epico-5-*.md`. Os itens só ficam ✅ no checklist acima quando repetidos em **produção**.

| Item | Homologação | Evidência |
| --- | --- | --- |
| URL NFC/QR → produção | ⏳ pendente | Produção ainda não existe; QR atual aponta para homologação (H4) |
| Produção só com credenciais de produção | ⏳ pendente | Projeto Vercel de produção ainda não criado |
| Admin entra e visitante não acessa o painel | ✅ | H3 (`/admin*` → 307 login) e login testado no Épico 3/4 |
| Produto ativo aparece; inativo não | ✅ | Banco: H5 (RLS 38/38, inativos invisíveis ao visitante). Tela: cardápio de homologação lista só itens ativos (Épico 2/4) |
| Indisponibilidade segue o comportamento definido | ✅ | Épico 4 N1/N10 (esmaecido + `INDISPONÍVEL`) |
| Troca de foto sem quebrar nem deixar órfão | ✅ | Épico 4 B6/N6/R-N9b |
| Vídeo só no detalhe, sem som, foto como fallback | ✅ | Épico 4 N7/R-N7 |
| Abre bem no celular com rede móvel | ✅ simulado / ⏳ aparelho real | H1 (perf 88–98, LCP ≤ 2,9 s, CLS 0); falta H6 no celular |
| Erros de formulário compreensíveis | ✅ | Épico 4 N5/N8 |
| Procedimento de rollback conhecido | ✅ | [[09-Ambientes-e-Deploy]] (Recuperação): promover deploy anterior na Vercel / reverter PR |

### Preparação da produção (2026-10-10)

Pacote pré-lançamento testado em build de produção local (evidências em `docs/testes/epico-6-resultados.md`): ícones e favicon, manifest, `robots.txt` por ambiente, painel sempre `noindex`, cabeçalhos de segurança e trava de envio duplicado no login. Roteiro de publicação em `docs/publicacao-producao.md` e orientação da equipe em `docs/guia-da-equipe.md`.

Ainda dependem do responsável: teste em celular real (H6), projeto Vercel de produção, endereço público, administrador de produção e conteúdo real.

### Status em produção (2026-10-10)

Publicado em `https://salgae-producao.vercel.app` com o banco `SALGAE-PRODUCTION`. Detalhes em `docs/publicacao-producao.md`.

| Item do checklist | Produção |
| --- | --- |
| URL do QR Code aponta para produção | ✅ QR gerado e verificado (NFC fica para uma fase posterior) |
| Produção só com credenciais de produção | ✅ variáveis próprias; banco conferido por hash contra a homologação |
| Visitante não acessa o painel | ✅ `/admin` → login. Entrada do administrador: ⏳ falta criar o usuário |
| Produto ativo/inativo, indisponibilidade, troca de foto, vídeo | ⏳ depende do cadastro do conteúdo real |
| Abre bem em celular com rede móvel | ⏳ teste em aparelho real |
| Procedimento de rollback conhecido | ✅ |

### Operação (2026-10-14)

- Erros do servidor saem como uma linha JSON com o nome do evento e o código do erro, o que permite filtrar nos logs da Vercel em vez de ler texto solto.
- O Dependabot propõe atualizações de dependências toda segunda-feira, como PR para a `develop`, e cada uma passa pelo CI completo antes do merge.
- A renovação de sessão roda só no painel. As páginas do cardápio não usam sessão e deixaram de chamar o Auth do Supabase a cada visita.

### Operação (2026-11-15)

- O workflow **Ambientes no ar** faz ping no `/api/health` dos dois ambientes a cada 2 dias e uma cópia semanal do banco da produção. Ele só roda sozinho depois de chegar à `main`, e a cópia depende de segredos ainda não cadastrados ([[09-Ambientes-e-Deploy]]).
- O workflow **Migrations** falha sem os segredos, em vez de terminar verde sem conferir nada.
- O painel confere a sessão sem ir ao Auth a cada leitura (assinatura do token conferida com a chave pública), e a API continua conferindo o token e o perfil em cada escrita (PR #89).

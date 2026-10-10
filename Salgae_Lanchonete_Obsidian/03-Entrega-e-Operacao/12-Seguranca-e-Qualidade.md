---
titulo: "Segurança e qualidade"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-10-10
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

## Verificações antes de merge

| Verificação | Obrigatória quando aplicável |
| --- | --- |
| Lint | Sim |
| Typecheck | Sim, se a aplicação usar TypeScript |
| Testes automatizados | Para regras de negócio, acesso e regressões críticas |
| Build de produção | Sim |
| Teste manual em celular | Sim, para alteração de interface pública |
| Revisão de permissões/RLS | Para tabelas, Storage, Auth ou painel |

## Checklist de lançamento

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

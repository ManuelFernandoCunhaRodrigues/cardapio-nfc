# Épico 6 — pacote pré-lançamento: plano de testes do Claude

Branch `chore/pre-lancamento`. Estes são os testes que o Claude propõe (navegador, rede e build). Pelo protocolo de testes cruzados, o Codex valida a **ideia** antes da execução; os testes do Codex estão em `epico-6-plano-codex.md`.

Ambiente: build de produção local (`npm run build` + `npm run start`) com as variáveis do SALGAE-STAGING. Nada é executado contra produção.

| # | Teste | Prova | Falha se |
| --- | --- | --- | --- |
| P1 | `npm run lint`, `typecheck`, `test`, `build` | Pacote não quebra o que já existia | Qualquer comando sair com erro |
| P2 | `GET /favicon.ico`, `/icon.png`, `/apple-icon.png` | Ícones servidos (fim do 404) | Status ≠ 200 ou `content-type` que não seja de imagem |
| P3 | `<head>` da home contém `link rel="icon"`, `apple-touch-icon` e `manifest` | Convenções do App Router ligadas | Alguma tag ausente |
| P4 | `GET /manifest.webmanifest` | Manifest válido | JSON inválido, ícone apontando para 404 |
| P5 | Cabeçalhos em `/`, `/cardapio`, `/admin/login` e num arquivo estático | Cabeçalhos de segurança em todas as rotas | Falta `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` ou HSTS em alguma |
| P6 | Sem `NEXT_PUBLIC_SITE_ENV`: `GET /robots.txt` e meta robots da home | Homologação não indexa por padrão | robots sem `Disallow: /` ou home sem `noindex` |
| P7 | Com `NEXT_PUBLIC_SITE_ENV=production` (rebuild): `robots.txt` e meta robots | Produção indexa o cardápio e protege o painel | `Disallow: /` presente, home com `noindex`, ou `/admin` sem `Disallow` |
| P8 | `/admin/login` com `SITE_ENV=production` | Painel é sempre noindex | Página de login sem `noindex` |
| P9 | Árvore de acessibilidade do atalho de busca: nome acessível × texto visível | Corrige `label-content-name-mismatch` | Nome acessível não contém o texto visível |
| P10 | Lighthouse (a11y) na home, **sem** dev server nem Codex em paralelo | Regressão zero em a11y | a11y < 100 ou a auditoria `label-content-name-mismatch` reprovar |
| P11 | Painel: escolher foto no formulário de produto (input de arquivo) com a `Permissions-Policy` nova | Cabeçalho não bloqueia câmera/galeria | Seletor de arquivo não abre ou erro de policy no console |
| P12 | Login com senha errada duas vezes e com e-mail inexistente | Mensagem neutra e botão protegido contra clique duplo | Mensagens diferentes para e-mail inexistente × senha errada |
| P13 | Console e rede da home e do detalhe de produto (com vídeo) | Cabeçalhos não quebraram fontes, imagens ou vídeo do Supabase | Erro de console ou requisição bloqueada |

Limite conhecido: P11 em desktop valida o seletor de arquivo, não a câmera real — isso entra no roteiro do celular (H6).

# Épico 6 — plano de testes proposto pelo Codex

Data: 2026-10-10  
Status: C1 e C2 foram escritos e executados nesta rodada; os testes de navegador e produção abaixo continuam como proposta para validação do Claude antes da execução.

## Testes unitários propostos

| Código | Teste | O que prova | Como falharia se a implementação estivesse errada |
| --- | --- | --- | --- |
| C1 | `lib/env.test.ts`: `getSiteEnv()` aceita somente `production` e `staging`; sem a variável, com valor inválido ou com caixa/espaços diferentes (`Production`, ` production `) retorna `staging`. Também confirma que ele não lança sem as duas variáveis do Supabase. `getSiteUrl()` retorna uma `URL` válida e retorna `undefined` se ausente ou inválida. Todos os cenários usam `vi.stubEnv`/`vi.unstubAllEnvs`. | A proteção contra indexação parte de um valor controlado, não normaliza entradas ambíguas e não depende das variáveis obrigatórias do Supabase; a base opcional dos metadados só existe com URL válida. | Um ambiente ausente/inválido poderia ser tratado como produção, liberando indexação acidentalmente; caixa/espaços poderiam passar indevidamente; a leitura do ambiente poderia lançar no CI sem Supabase; ou uma URL inválida poderia ser usada como `metadataBase`. |
| C2 | `lib/seo/robots.test.ts`: produção retorna somente `Disallow: /admin`; staging retorna `Disallow: /`. | As regras puras que alimentam `app/robots.ts` preservam o bloqueio integral fora da produção e o bloqueio permanente do painel. | O cardápio de staging poderia ficar indexável ou a produção poderia bloquear tudo/deixar o painel indexável. |

## Testes sugeridos ao Claude no navegador e na build

| Código | Teste | O que prova | Como falharia se a implementação estivesse errada |
| --- | --- | --- | --- |
| C3 | Rodar lint, typecheck, Vitest e build de produção com as variáveis de staging. | Imports, tipos estritos, rotas de metadados e ícones são aceitos pelo Next 16. | Erro de tipo, rota dinâmica inválida ou import quebrado interrompe a verificação. |
| C4 | Em staging, requisitar `/robots.txt` e inspecionar a meta robots da home. | A ausência ou invalidez de `NEXT_PUBLIC_SITE_ENV` bloqueia rastreamento e indexação. | `Disallow: /` ou `noindex,nofollow` não aparece. |
| C5 | Em uma nova build com `NEXT_PUBLIC_SITE_ENV=production`, requisitar `/robots.txt`, a home e `/admin/login`. | Produção libera o cardápio, mantém `/admin` bloqueado e o painel sempre noindex. | Home bloqueada, `/admin` ausente do robots ou login sem noindex. |
| C6 | Requisitar `/favicon.ico`, `/icon.png`, `/apple-icon.png` e `/manifest.webmanifest`; conferir status, MIME e que o manifesto aponta para ícones existentes. | As convenções de metadados do App Router servem os ícones e o manifesto sem 404. | Alguma rota retorna 404, formato incorreto ou ícone inexistente no manifesto. |
| C7 | Conferir os cabeçalhos em uma rota pública, `/admin/login` e um recurso estático. | Todos recebem `nosniff`, referrer policy, frame denial, permissions policy e HSTS. | Um cabeçalho está ausente, tem valor divergente ou recursos estáticos escapam da regra. |
| C8 | Com DevTools/auditoria de acessibilidade, verificar o link de busca da home. | O nome acessível contém exatamente o texto visível “Busque seu salgado favorito”. | A auditoria `label-content-name-mismatch` volta a reprovar. |
| C9 | No painel, iniciar login e clicar repetidamente em “Entrar no painel”; repetir com senha incorreta e e-mail inexistente. | O botão permanece desabilitado durante o envio, não há chamadas duplicadas e a mensagem visível é neutra. | Duas requisições são enviadas, o botão continua ativo ou as mensagens diferem por existência do e-mail. |
| C10 | Em celular, abrir os seletores de foto e vídeo do painel e enviar mídia de teste. | `Permissions-Policy: camera=()` não interfere no fluxo baseado em `<input type="file">`; galeria/captura oferecida pelo sistema continua disponível. | Seletor não abre ou o navegador aponta bloqueio de política. |

Não executar C9 contra contas reais sem observar os limites configurados do Supabase Auth; o teste deve usar uma conta autorizada de homologação e poucas tentativas controladas.

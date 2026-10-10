# Épico 6 — pacote pré-lançamento: resultados

Data: 2026-10-10 · Branch `chore/pre-lancamento` · Build de produção local (`next start`, porta 3100) com as variáveis do SALGAE-STAGING. Nada foi executado contra produção.

Protocolo: o Codex propôs C1–C10 (`epico-6-plano-codex.md`) e o Claude validou; o Claude propôs P1–P13 (`epico-6-plano-claude.md`) e o Codex validou (`epico-6-validacao-codex.md`). Os ajustes pedidos pelos dois lados foram aplicados antes da execução.

## Ajustes da validação cruzada

- Claude → Codex: C1 ampliado (sem variáveis do Supabase, caixa/espaços caem em `staging`, `getSiteUrl`); `aria-label` duplicado removido do atalho de busca; matcher do `proxy.ts` sem redundância.
- Codex → Claude: P6 com a variável ausente **na build**; P5 comparando valores exatos; P10 exigindo a auditoria específica, não só a nota; P2/P4 conferindo que o `proxy` não redireciona; P13 com falhas registradas uma a uma.
- Divergência resolvida: o Codex corrigiu `lib/media.test.ts` com `vi.stubEnv`; a mesma falha já tinha sido corrigida no PR #9 passando `''`. Ficou a versão do PR #9 (uma só correção nas duas branches); o registro do Codex em `epico-6-validacao-codex.md` descreve a outra forma.

## Execução

| # | Resultado | Evidência |
| --- | --- | --- |
| P1 / C3 | ✅ | `lint` e `typecheck` sem erros; Vitest **17 arquivos, 65 testes** (com as variáveis do CI); `build` gerou `/icon.png`, `/apple-icon.png`, `/manifest.webmanifest`, `/robots.txt` |
| C1, C2 | ✅ | Incluídos nos 65 testes; executados pelo Codex e repetidos pelo Claude |
| P2 / C6 | ✅ | `/favicon.ico` 200 `image/x-icon`; `/icon.png` e `/apple-icon.png` 200 `image/png` (512×512 e 180×180); sem redirecionamento do `proxy` |
| P3 | ✅ | `<head>` com `rel="icon"` (ico e png), `apple-touch-icon`, `manifest`, `theme-color`, `application-name` |
| P4 | ✅ | Manifest JSON válido; os dois ícones citados respondem 200 |
| P5 / C7 | ✅ | Os cinco cabeçalhos, com os valores exatos, em `/`, `/cardapio`, `/admin/login`, `/brand/salgae-logo.webp` e `/icon.png` |
| P6 / C4 | ✅ | Build sem `NEXT_PUBLIC_SITE_ENV`: `robots.txt` = `Disallow: /`; home com `noindex, nofollow` |
| P7 / C5 | ✅ | Build com `NEXT_PUBLIC_SITE_ENV=production`: `robots.txt` = `Disallow: /admin`; home e `/cardapio` sem meta `noindex` |
| P8 | ✅ | `/admin/login` com `noindex, nofollow` nos dois modos |
| P9 / C8 | ✅ | Link de busca sem `aria-label`; nome acessível = texto visível "Busque seu salgado favorito" |
| P10 | ✅ | Lighthouse 13.5.0 mobile na home: a11y 100, boas práticas 100; `label-content-name-mismatch` = não aplicável (nenhum elemento com rótulo divergente); nenhuma auditoria reprovada |
| P12 / C9 | ✅ parcial | Três envios seguidos do formulário geraram **uma** requisição a `/auth/v1/token` (400) e a mensagem neutra. E-mail existente × inexistente não foi comparado em tela: o código devolve a mesma mensagem para qualquer erro do Supabase (`login-form.tsx`) |
| P13 | ✅ parcial | Home e detalhe de produto sem erro de console nem requisição bloqueada; fontes carregadas. **Não há produto com vídeo publicado em homologação hoje**, então o vídeo não foi exercitado nesta rodada (coberto no Épico 4, N7) |
| P11 / C10 | ⏳ | Não executado: exige sessão de administrador e aparelho real. Por código, o painel só usa `<input type="file">` (sem `getUserMedia`), que `Permissions-Policy: camera=()` não afeta. Entra no roteiro do celular (H6) |

## Observações

- Ícones: o Codex gerou com fundo bege; o logo tem fundo branco e formava uma faixa. O Claude trocou o fundo para branco em `scripts/gerar-icones.mjs` e regenerou.
- HSTS só tem efeito sob HTTPS: conferir no deploy da Vercel.
- CSP ficou de fora de propósito; o que ela precisaria liberar está no relatório do Codex.
- Aviso de segurança do Supabase (staging): "leaked password protection" desativada — recurso de plano pago.

## Pendências para o responsável

- H6 no celular real, incluindo P11 (foto pela câmera no painel).
- Definir `NEXT_PUBLIC_SITE_ENV=production` e `NEXT_PUBLIC_SITE_URL` no projeto Vercel de produção.

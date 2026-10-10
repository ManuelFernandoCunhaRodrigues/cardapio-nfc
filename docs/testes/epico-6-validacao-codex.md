# Épico 6 — validação do plano do Claude pelo Codex

Data: 2026-10-10  
Escopo: avaliação da ideia dos testes P1–P13. O plano original do Claude não foi alterado.

| Código | Veredito | Avaliação e ajuste necessário |
| --- | --- | --- |
| P1 | APROVADO | Lint, typecheck, Vitest e build são a base adequada para detectar regressões de integração do pacote. Executar com as variáveis públicas mínimas definidas, como no CI. |
| P2 | APROVADO | Requisitar as três rotas confirma o fim do 404 e o tipo de resposta. Conferir `image/x-icon` para ICO e `image/png` para os PNGs. |
| P3 | APROVADO | A inspeção do `<head>` valida que as convenções de arquivo foram conectadas pelo App Router. Aceitar tags adicionais geradas pelo Next, sem exigir ordem específica. |
| P4 | APROVADO | O endpoint e os caminhos de ícone devem ser conferidos juntos; isso detecta manifesto válido que ainda referencia recurso inexistente. |
| P5 | APROVADO | Cobrir rota pública, painel e estático verifica o alcance de `headers()`. Conferir também os valores exatos dos cinco cabeçalhos, não só a presença. |
| P6 | AJUSTAR | A ausência de `NEXT_PUBLIC_SITE_ENV` precisa ocorrer na hora da build, em ambiente limpo ou com a variável explicitamente removida; valores `NEXT_PUBLIC_` podem ser incorporados na build. |
| P7 | APROVADO | A nova build com `NEXT_PUBLIC_SITE_ENV=production` é indispensável para separar o comportamento de produção do staging. |
| P8 | AJUSTAR | Usar o nome correto `NEXT_PUBLIC_SITE_ENV=production`. A ideia de conferir o login do painel sempre noindex está correta. |
| P9 | APROVADO | A árvore de acessibilidade compara diretamente o nome calculado com o texto visível e cobre a falha do Lighthouse. |
| P10 | AJUSTAR | Exigir a aprovação da auditoria `label-content-name-mismatch`; registrar a nota Lighthouse e tratá-la como sinal de regressão, sem fazer de uma nota global fixa de 100 o único critério. A nota pode variar com a versão da ferramenta. |
| P11 | AJUSTAR | Em desktop, o teste prova o seletor de arquivos, não a captura real. Manter o teste e completar no celular com o roteiro H6 para confirmar galeria/câmera do sistema. |
| P12 | APROVADO | Comparar as mensagens e disparar uma tentativa dupla rápida cobre enumeração visível e a trava local contra duplicação. Usar conta autorizada de homologação e poucas tentativas. |
| P13 | AJUSTAR | A verificação é útil como smoke test, mas deve usar produto conhecido com vídeo publicado e registrar requisições bloqueadas/falhas individualmente; os cabeçalhos atuais não incluem CSP, portanto este teste não prova uma CSP futura. |

## Lacunas identificadas

- Não há teste de resposta HTTP para garantir que o `proxy` não intercepta `favicon.ico`, ícones PNG, manifesto e robots; incluir esses endpoints em P2/P4 e verificar que não há redirecionamento de sessão.
- P5 deve comparar os valores completos dos cabeçalhos, incluindo `max-age=63072000; includeSubDomains` no HSTS e `camera=()` na Permissions-Policy.
- Validar os metadados com e sem `NEXT_PUBLIC_SITE_URL` válida: em produção, uma URL válida deve aparecer como base; ausente/inválida não pode quebrar a renderização.
- Conferir a validade estrutural do ICO e as dimensões dos PNGs na build ou antes dela, além do status HTTP.

## Execução local desta rodada

Não foi executado `npm run build`, conforme o escopo desta rodada; a build permanece para o Claude.

| Comando | Resultado real |
| --- | --- |
| `npm run lint` | Não iniciou: o PowerShell recusou carregar `C:\Program Files\nodejs\npm.ps1` porque o arquivo não está assinado digitalmente (`PSSecurityException`). Nenhuma política do sistema foi alterada. |
| `npm.cmd run lint` | Aprovado, saída 0; `eslint .` não reportou erros. Executado novamente após as correções, também com saída 0. |
| `npm.cmd run typecheck` | Aprovado, saída 0; `tsc --noEmit` não reportou erros. Executado novamente após as correções, também com saída 0. |
| `$env:NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co'; $env:NEXT_PUBLIC_SUPABASE_ANON_KEY='ci-placeholder'; npm.cmd test` — primeira execução | Falhou: 1 arquivo e 1 teste falharam (`lib/media.test.ts > getPublicMediaUrl > não retorna URL para mídia ou projeto ausente`); 16 arquivos e 64 testes passaram. O teste passava `undefined` ao parâmetro opcional, acionando o valor padrão da variável do CI e produzindo `https://example.supabase.co/...` em vez de `null`. |
| Mesmo comando de Vitest — após corrigir o isolamento de ambiente em `lib/media.test.ts` | Aprovado, saída 0: **17 arquivos passaram e 65 testes passaram** em 3,12 s. O Vitest emitiu apenas aviso não bloqueante sobre futura mudança de `configLoader` do Vite para configuração ESM carregada como CommonJS. |

Correção aplicada para a falha reproduzida: o teste de mídia agora usa `vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined)` e `vi.unstubAllEnvs()`, testando efetivamente o cenário sem projeto sem depender do ambiente do processo.

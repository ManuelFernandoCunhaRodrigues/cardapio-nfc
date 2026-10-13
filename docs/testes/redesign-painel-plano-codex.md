# Redesign do painel — plano de testes do Codex

Data: 2026-10-13 · Pacote B · complemento unitário ao plano P1–P17 do Claude.

## Cobertura unitária

- Situação do produto: `No cardápio`, `Em falta hoje` e `Escondido` ↔ `is_active`/`is_available`, incluindo o estado antigo contraditório.
- “Precisam de atenção”: indisponível ou sem foto, sem duplicar; os dois motivos permanecem no mesmo item.
- Lista de produtos: busca sem acento, categoria e filtros `Indisponíveis`, `Sem foto` e `Desativados`, combináveis.
- Destino do destaque: cardápio inteiro, categoria, produto e endereço próprio, sempre no campo `target` atual.
- Horários: sete dias no formato atual e cópia de um dia para todos.
- Criação: produto → foto → vídeo; falhas simuladas de foto e vídeo preservam o produto; toque duplo reutiliza a mesma execução.

Implementação: `lib/admin/panel.ts` e `lib/admin/panel.test.ts`. A suíte também mantém os testes existentes de ações de mídia, validação, compactação, autenticação e horários.

## Verificações de integração

- Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
- No navegador autenticado, executar P1–P17 nos viewports 390×844, 360×640 e 1440×900.
- Em P8, testar separadamente: sucesso total, foto recusada, falha de rede na foto, falha no vídeo e dois toques rápidos em Criar.
- Em P14, percorrer as folhas de Categoria, Destaque e Estado da loja por Tab/Shift+Tab; fechar com Esc e conferir o retorno do foco.

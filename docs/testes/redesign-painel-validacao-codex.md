# Redesign do painel — validação do Codex

Data: 2026-10-13.

## P1–P17

- P1–P3: login com olho e trava; casca responsiva e barra condicional; pílula da loja usa validação, `requireAdmin`, auditoria e revalidação.
- P4–P7: resumo, atenção sem duplicatas, filtros por URL, situação única e ordem restrita à categoria implementados.
- P8–P10: criação sequencial com foto/vídeo, trava de repetição, andamento, falhas parciais e avisos anunciados implementados.
- P11–P12: editores em folha com foco preso; quatro destinos de destaque; horários sem rolagem lateral, cópia e salvar fixo.
- P13–P15: textos operacionais sem jargão; alvos de 44 px; ações continuam protegidas por `requireAdmin` e validadores.
- P16: nenhuma tela/componente do cardápio público foi alterada; componentes existentes foram apenas reutilizados.
- P17: coberto por lint, tipos, testes e build; console/rede ainda requer sessão autenticada no navegador.

Validação visual autenticada permanece manual, pois não foram fornecidas credenciais. Prioridade: P8 (falhas de mídia), P3 (reflexo público) e P14 (foco/teclado).

## Execução automatizada

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run test`: 32 arquivos e 164 testes passaram.
- `npm run build`: passou; durante a geração estática, o ambiente sem rede registrou falhas de leitura do Supabase, tratadas pelos estados de fallback já existentes.

## Divergências resolvidas

- A tela 09 mostra dois alternadores, mas a melhoria aprovada nº 9 exige uma situação única; prevaleceu a decisão mais recente.
- A tela cita vídeo de 10 MB; a revisão R9 manda não exibir tamanho e preservar o limite existente de 50 MB. A interface informa apenas “até 15 segundos”.

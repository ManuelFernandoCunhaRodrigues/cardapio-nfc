// Escreve a cobertura medida pelo Vitest em Markdown, para o resumo do job no GitHub Actions.
import { readFileSync } from 'node:fs';

const { total } = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'));
const row = (key, label) =>
  `| ${label} | ${total[key].pct}% | ${total[key].covered} de ${total[key].total} |`;

console.log(
  [
    '### Cobertura dos testes (lib/ e app/)',
    '',
    '| Medida | % | Cobertos |',
    '| --- | --- | --- |',
    row('statements', 'Instruções'),
    row('branches', 'Ramos'),
    row('functions', 'Funções'),
    row('lines', 'Linhas'),
  ].join('\n'),
);

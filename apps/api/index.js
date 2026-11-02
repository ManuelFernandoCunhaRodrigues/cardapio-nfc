// Entrada da Vercel: tem prioridade sobre src/index.ts e aponta para a saída do `npm run build`.
// O pacote gerado embute o @salgae/core, que publica TypeScript e não roda direto no Node.
export { default } from './dist/index.js';

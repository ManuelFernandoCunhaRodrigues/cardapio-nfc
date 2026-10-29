import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Código do servidor e regras; os componentes de tela são cobertos pelos testes de ponta a
      // ponta (`e2e/`), que esta medição não enxerga.
      include: ['lib/**/*.ts', 'app/**/*.ts'],
      exclude: ['**/*.test.ts', 'lib/supabase/database.types*.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // Piso um pouco abaixo da medição de 2026-10-14: a cobertura não pode cair sem alguém ver.
      thresholds: { statements: 52, branches: 51, functions: 68, lines: 53 },
    },
  },
});

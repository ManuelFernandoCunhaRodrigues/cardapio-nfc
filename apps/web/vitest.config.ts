import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/', import.meta.url)),
      '@salgae/core': fileURLToPath(new URL('../../packages/core/src/', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Código do servidor e regras; os componentes de tela são cobertos pelos testes de ponta a
      // ponta (`e2e/`), que esta medição não enxerga.
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // As regras migradas para `@salgae/core` têm um piso próprio; este mede apenas o web.
      thresholds: { statements: 51, branches: 49, functions: 65, lines: 52 },
    },
  },
});

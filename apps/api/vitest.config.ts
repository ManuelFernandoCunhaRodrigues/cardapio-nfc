import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Repositories são adaptadores finos do Supabase: quem os testa são os E2E da API
      // (`e2e/api`), contra o Supabase local do CI. A regra fica nos services, medidos aqui.
      exclude: ['src/**/*.test.ts', 'src/test-support/**', 'src/**/*.repository.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 87 },
    },
  },
});

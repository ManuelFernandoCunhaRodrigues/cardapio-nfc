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
      exclude: ['src/**/*.test.ts', 'src/database/database.types*.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
      thresholds: { statements: 73, branches: 85, functions: 72, lines: 73 },
    },
  },
});

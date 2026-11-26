import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/', import.meta.url)),
      '@salgae/core': fileURLToPath(new URL('../../packages/core/src/', import.meta.url)),
    },
  },
  // O tsconfig do Next deixa o JSX para o próprio Next; nos testes de componente quem compila é o Vitest.
  esbuild: { jsx: 'automatic' },
  test: {
    // Testes de componente (`.test.tsx`) pedem o navegador simulado no topo do arquivo:
    // `// @vitest-environment happy-dom`.
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // Os componentes que ainda não têm teste próprio são cobertos pelos testes de ponta a ponta
      // (`e2e/`), que esta medição não enxerga.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', 'src/test-support/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // Pisos cerca de 2 pontos abaixo do medido em 2026-11-17: a cobertura não cai sem o CI
      // reclamar. As regras migradas para `@salgae/core` têm um piso próprio; este mede apenas o web.
      // O piso geral vale para os componentes (`.tsx`), que só começaram a ter teste próprio; o
      // código de servidor e as regras (`.ts`) têm o piso deles.
      thresholds: {
        statements: 4,
        branches: 4,
        functions: 3,
        lines: 4,
        'src/**/*.ts': { statements: 70, branches: 69, functions: 71, lines: 70 },
      },
    },
  },
});

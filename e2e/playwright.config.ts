import { defineConfig, devices } from '@playwright/test';

// Fora do CI, os testes usam as mesmas variáveis do site.
try {
  process.loadEnvFile('../apps/web/.env.local');
} catch {
  // No CI, as variáveis são definidas pelo próprio job.
}

// Os testes de ponta a ponta rodam contra o build de produção (`next start`) ligado ao Supabase
// local (`supabase start`), com os dados de `supabase/seed.sql`.
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const adminStorageState = 'playwright/.auth/admin.json';

export default defineConfig({
  testDir: '.',
  // O painel altera dados que o cardápio lê: um arquivo por vez, na ordem dos projetos. Só o
  // `painel-desktop` grava; os demais projetos apenas leem.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'publico-celular',
      testMatch: /publico\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'painel-desktop',
      testMatch: /painel\/.*\.spec\.ts/,
      dependencies: ['publico-celular'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: adminStorageState,
      },
    },
    {
      name: 'publico-desktop',
      testMatch: /publico\/.*\.spec\.ts/,
      grep: /@responsive/,
      dependencies: ['painel-desktop'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'painel-celular',
      testMatch: /painel\/.*\.spec\.ts/,
      grep: /@leitura/,
      dependencies: ['painel-desktop'],
      use: { ...devices['Pixel 7'], storageState: adminStorageState },
    },
    {
      name: 'sair',
      testMatch: /sessao\/.*\.spec\.ts/,
      dependencies: ['publico-desktop', 'painel-celular'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -w @salgae/web -- --port ${port}`,
        cwd: '..',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

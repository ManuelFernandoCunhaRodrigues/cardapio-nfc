import { defineConfig, devices } from '@playwright/test';

import { adminStorageState, apiPort, apiURL } from './env';

// Fora do CI, os testes usam as mesmas variáveis do site.
try {
  process.loadEnvFile('../apps/web/.env.local');
} catch {
  // No CI, as variáveis são definidas pelo próprio job.
}

// Os testes de ponta a ponta rodam contra os builds de produção da API e do site ligados ao
// Supabase local (`supabase start`), com os dados de `supabase/seed.sql`. Com E2E_API_URL ou
// E2E_BASE_URL definidos, usam o servidor que já está no ar (o CI sobe a API antes do build do site).
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: '.',
  // O painel altera dados que o cardápio lê: um arquivo por vez, na ordem dos projetos. Gravam
  // só o `painel-desktop` e os projetos de movimento, que rodam depois das leituras.
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
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
    },
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
      name: 'movimento-celular',
      testMatch: /movimento\/.*\.spec\.ts/,
      dependencies: ['publico-desktop', 'painel-celular'],
      use: { ...devices['Pixel 7'], storageState: adminStorageState },
    },
    {
      name: 'movimento-desktop',
      testMatch: /movimento\/.*\.spec\.ts/,
      dependencies: ['movimento-celular'],
      use: { ...devices['Desktop Chrome'], storageState: adminStorageState },
    },
    {
      name: 'sair',
      testMatch: /sessao\/.*\.spec\.ts/,
      dependencies: ['movimento-desktop'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    ...(process.env.E2E_API_URL
      ? []
      : [
          {
            command: 'npm run start -w @salgae/api',
            cwd: '..',
            url: `${apiURL}/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            env: {
              PORT: String(apiPort),
              SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
              SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
              WEB_ORIGIN: baseURL,
            },
          },
        ]),
    ...(process.env.E2E_BASE_URL
      ? []
      : [
          {
            command: `npm run start -w @salgae/web -- --port ${port}`,
            cwd: '..',
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: { API_URL: apiURL },
          },
        ]),
  ],
});

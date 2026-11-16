import { defineConfig, devices } from '@playwright/test';

import { adminStorageState, baseURL, port } from './env';

// Fora do CI, os testes usam as mesmas variáveis do site.
try {
  process.loadEnvFile('../apps/web/.env.local');
} catch {
  // No CI, as variáveis são definidas pelo próprio job.
}

// O painel grava e apaga dados de teste. O `.env.local` de quem desenvolve costuma apontar para o
// stage, então rodar a suíte localmente encheria o stage de produtos de teste. Só segue com um
// Supabase que não seja local se isso for pedido de propósito.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const usesLocalSupabase = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(supabaseUrl);
if (
  !process.env.CI &&
  supabaseUrl &&
  !usesLocalSupabase &&
  process.env.E2E_ALLOW_REMOTE_SUPABASE !== '1'
) {
  throw new Error(
    `Os testes de ponta a ponta gravam no banco, e NEXT_PUBLIC_SUPABASE_URL aponta para ${supabaseUrl}. ` +
      'Rode com o Supabase local (`supabase start`) ou defina E2E_ALLOW_REMOTE_SUPABASE=1 se for mesmo essa a intenção.',
  );
}

// Os testes de ponta a ponta rodam contra o build de produção do site, com a API dentro dele,
// ligado ao Supabase local (`supabase start`), com os dados de `supabase/seed.sql`. Com
// E2E_BASE_URL definido, usam o servidor que já está no ar.
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
  webServer: process.env.E2E_BASE_URL
    ? []
    : [
        {
          command: `npm run start -w @salgae/web -- --port ${port}`,
          cwd: '..',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});

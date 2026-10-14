import { defineConfig, devices } from '@playwright/test';

// Fora do CI, os testes que consultam o Supabase usam as mesmas variáveis do app.
try {
  process.loadEnvFile('.env.local');
} catch {
  // Sem .env.local: o CI define as variáveis no próprio job.
}

// Os testes de ponta a ponta rodam contra o build de produção (`next start`) ligado ao Supabase
// local (`supabase start`), com os dados de `supabase/seed.sql`.
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  // O painel altera dados que o cardápio lê: um arquivo por vez, na ordem dos projetos.
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
      name: 'cardapio-celular',
      testMatch: /cardapio\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'painel-desktop',
      testMatch: /painel\.spec\.ts/,
      dependencies: ['cardapio-celular'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

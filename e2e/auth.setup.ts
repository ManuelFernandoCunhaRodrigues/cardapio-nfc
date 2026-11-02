import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { adminStorageState } from './env';
import { expect, test } from './fixtures';

test('autentica o administrador', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error('Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar os testes E2E.');

  await page.goto('/admin/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar no painel' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Resumo' })).toBeVisible();
  await mkdir(dirname(adminStorageState), { recursive: true });
  await page.context().storageState({ path: adminStorageState });
});

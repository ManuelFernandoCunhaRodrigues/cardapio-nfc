import { expect, test } from '../fixtures';

test.describe('autenticação do painel', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('senha errada não entra', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('E-mail').fill(process.env.E2E_ADMIN_EMAIL ?? '');
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada-de-proposito');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();

    await expect(
      page.getByText('Não foi possível entrar com essas credenciais. Tente novamente.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

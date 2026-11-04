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
    await expect(page.getByRole('button', { name: 'Entrar no painel' })).toBeEnabled();
  });

  test('o botão mostra o andamento enquanto o login acontece', async ({ page }) => {
    let releaseLogin = () => {};
    const loginHeld = new Promise<void>((resolve) => {
      releaseLogin = resolve;
    });
    await page.route('**/auth/v1/token**', async (route) => {
      await loginHeld;
      await route.continue();
    });
    await page.goto('/admin/login');
    await page.getByLabel('E-mail').fill(process.env.E2E_ADMIN_EMAIL ?? '');
    await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();

    const button = page.getByRole('button', { name: 'Entrando…' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByTestId('login-spinner')).toBeVisible();
    await expect(page.getByTestId('login-spinner')).toHaveCSS('animation-name', 'spin');

    releaseLogin();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('com menos animação, o botão só troca o texto', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let releaseLogin = () => {};
    const loginHeld = new Promise<void>((resolve) => {
      releaseLogin = resolve;
    });
    await page.route('**/auth/v1/token**', async (route) => {
      await loginHeld;
      await route.abort();
    });
    await page.goto('/admin/login');
    await page.getByLabel('E-mail').fill(process.env.E2E_ADMIN_EMAIL ?? '');
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada-de-proposito');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();

    await expect(page.getByRole('button', { name: 'Entrando…' })).toBeVisible();
    await expect(page.getByTestId('login-spinner')).toHaveCSS('animation-name', 'none');

    releaseLogin();
    await expect(page.getByRole('button', { name: 'Entrar no painel' })).toBeEnabled();
  });
});

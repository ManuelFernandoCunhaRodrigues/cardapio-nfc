import { expect, test, type Page } from '../fixtures';

async function signIn(page: Page) {
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
}

// O Sair do painel chama `signOut()`, que encerra todas as sessões do usuário, inclusive a salva
// pelo projeto `setup`. Por isso este teste roda num projeto próprio, depois de todos os outros.
test.describe('sessão do painel', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('sair encerra a sessão', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /^Sair/ }).filter({ visible: true }).click();
    await page
      .getByRole('alertdialog', { name: 'Sair do painel?' })
      .getByRole('button', { name: 'Sair', exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    // Sem cookie de sessão, o login não fala em sessão expirada, mas guarda a volta.
    await page.goto('/admin/produtos');
    await expect(page).toHaveURL(/\/admin\/login\?voltar=%2Fadmin%2Fprodutos$/);
  });
});

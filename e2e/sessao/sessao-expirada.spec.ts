import { expect, test, type AdminDb, type Page } from '../fixtures';

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
}

async function createCategory(page: Page, adminDb: AdminDb, name: string) {
  await page.goto('/admin/categorias');
  await page.getByRole('button', { name: 'Nova', exact: true }).click();
  await page.getByRole('dialog', { name: 'Nova categoria' }).getByLabel('Nome').fill(name);
  await page.getByRole('button', { name: 'Criar categoria' }).click();
  await expect(page.getByText('Categoria criada com sucesso.')).toBeVisible();

  const { data, error } = await adminDb.client
    .from('categories')
    .select('id')
    .eq('name', name)
    .single();
  expect(error).toBeNull();
  adminDb.track('categories', data!.id);
}

test.describe('sessão expirada durante uma gravação', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('recusa a ação, preserva o público e manda a próxima navegação ao login', async ({
    page,
    context,
    adminDb,
    uniqueName,
  }) => {
    const categoryName = uniqueName('categoria-sessao');
    await signIn(page);
    await createCategory(page, adminDb, categoryName);

    const publicPage = await context.newPage();
    await publicPage.goto('/cardapio');
    await expect(publicPage.getByRole('heading', { level: 2, name: categoryName })).toBeVisible();

    const logoutPage = await context.newPage();
    await logoutPage.goto('/admin');
    await logoutPage.getByRole('button', { name: /^Sair/ }).filter({ visible: true }).click();
    await expect(logoutPage).toHaveURL(/\/admin\/login$/);

    const card = page.getByRole('article').filter({ hasText: categoryName });
    await card.getByRole('button', { name: 'Esconder', exact: true }).click();
    await expect(
      page
        .getByText('Sua sessão não permite esta alteração. Entre novamente.')
        .filter({ visible: true }),
    ).toBeVisible();

    await publicPage.reload();
    await expect(publicPage.getByRole('heading', { level: 2, name: categoryName })).toBeVisible();

    await page
      .getByRole('link', { name: 'Produtos', exact: true })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

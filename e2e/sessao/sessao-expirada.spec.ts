import { expect, test, type AdminDb, type Page } from '../fixtures';

async function signInFromCurrentPage(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error('Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar os testes E2E.');

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
}

async function signIn(page: Page) {
  await page.goto('/admin/login');
  await signInFromCurrentPage(page);
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

  test('recusa a ação, preserva o público, explica no login e volta para a tela', async ({
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

    // Encerra a sessão no servidor e devolve o cookie antigo: é o caso real de sessão vencida,
    // em que o navegador ainda guarda o cookie, mas o Auth já não aceita o token.
    const staleCookies = await context.cookies();
    const logoutPage = await context.newPage();
    await logoutPage.goto('/admin');
    await logoutPage.getByRole('button', { name: /^Sair/ }).filter({ visible: true }).click();
    await logoutPage
      .getByRole('alertdialog', { name: 'Sair do painel?' })
      .getByRole('button', { name: 'Sair', exact: true })
      .click();
    await expect(logoutPage).toHaveURL(/\/admin\/login$/);
    await logoutPage.close();
    await context.addCookies(staleCookies);

    const card = page.getByRole('article').filter({ hasText: categoryName });
    await card.getByRole('button', { name: 'Esconder', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/login\?motivo=sessao&voltar=%2Fadmin%2Fcategorias$/);
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Sua sessão expirou. Entre de novo para continuar.' }),
    ).toBeVisible();

    await publicPage.reload();
    await expect(publicPage.getByRole('heading', { level: 2, name: categoryName })).toBeVisible();

    await signInFromCurrentPage(page);
    await expect(page).toHaveURL(/\/admin\/categorias$/);
    await expect(page.getByRole('article').filter({ hasText: categoryName })).toBeVisible();
  });
});

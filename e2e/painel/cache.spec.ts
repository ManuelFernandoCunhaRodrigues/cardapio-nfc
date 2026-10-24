import { expect, test } from '../fixtures';

test.describe('invalidação do cache público', () => {
  test('um contexto novo sem sessão vê o produto criado no painel', async ({
    page,
    browser,
    adminDb,
    uniqueName,
  }) => {
    const name = uniqueName('produto-cache');
    await page.goto('/admin/produtos/novo');
    await page.getByLabel('Nome do produto').fill(name);
    await page.getByLabel('Preço').fill('14,50');
    await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
    await page.getByRole('button', { name: 'Criar produto' }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}\?criado=1$/);
    const productId = new URL(page.url()).pathname.split('/').pop();
    expect(productId).toMatch(/^[0-9a-f-]{36}$/);
    adminDb.track('products', productId!);

    const publicContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      expect((await publicContext.storageState()).cookies).toEqual([]);
      const publicPage = await publicContext.newPage();
      await publicPage.goto('/cardapio');
      await expect(publicPage.getByRole('heading', { level: 3, name })).toBeVisible();
    } finally {
      await publicContext.close();
    }
  });
});

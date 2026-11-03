import { expect, test, type AdminDb, type Page } from '../fixtures';

function slugFromName(name: string) {
  return name.toLowerCase().replaceAll(' ', '-');
}

async function createProduct(page: Page, adminDb: AdminDb, productName: string) {
  await page.goto('/admin/produtos/novo');

  await page.getByRole('textbox', { name: 'Nome do produto' }).fill(productName);
  await page.getByRole('textbox', { name: 'Preço' }).fill('12,34');
  await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
  await page.getByRole('button', { name: 'Criar produto' }).click();

  await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}\?criado=1$/);
  const productId = new URL(page.url()).pathname.split('/').pop();
  expect(productId).toMatch(/^[0-9a-f-]{36}$/);
  adminDb.track('products', productId!);
  return { productId: productId!, productSlug: slugFromName(productName) };
}

async function coxinhasOnMenu(page: Page) {
  await page.goto('/cardapio');
  return page.locator('section#coxinhas [role="listitem"] h3').allTextContents();
}

test.describe('produtos do painel', () => {
  test('cria um produto e ele aparece no cardápio', async ({ page, adminDb, uniqueName }) => {
    const productName = uniqueName('criar');
    const { productId, productSlug } = await createProduct(page, adminDb, productName);

    await page.goto(`/produto/${productId}`);
    await expect(page).toHaveURL(new RegExp(`/produto/${productSlug}$`));
    await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
    await expect(page.getByText('R$ 12,34')).toBeVisible();
    expect(await coxinhasOnMenu(page)).toContain(productName);
  });

  test('reordenar no painel muda a ordem no cardápio', async ({ page, adminDb, uniqueName }) => {
    const productName = uniqueName('reordenar');
    await createProduct(page, adminDb, productName);
    const before = await coxinhasOnMenu(page);
    const index = before.indexOf(productName);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(before.length).toBeGreaterThan(1);

    const moveUp = index > 0;
    const neighbor = moveUp ? index - 1 : index + 1;
    const expected = [...before];
    [expected[index], expected[neighbor]] = [expected[neighbor], expected[index]];

    await page.goto('/admin/produtos');
    await page
      .getByRole('button', { name: `${moveUp ? 'Subir' : 'Descer'} ${productName}` })
      .filter({ visible: true })
      .click();
    await expect(page.getByText('Ordem do produto atualizada.')).toBeVisible();

    expect(await coxinhasOnMenu(page)).toEqual(expected);
  });

  test('marcar "Em falta hoje" mostra o produto como indisponível', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const productName = uniqueName('em-falta');
    const { productId, productSlug } = await createProduct(page, adminDb, productName);

    await page.goto('/admin/produtos');
    const situation = page.getByLabel(`Situação de ${productName}`).filter({ visible: true });
    await situation.selectOption('unavailable');
    await expect(page.getByText('Situação do produto atualizada.')).toBeVisible();
    await expect(situation).toHaveValue('unavailable');

    await page.goto(`/produto/${productId}`);
    await expect(page).toHaveURL(new RegExp(`/produto/${productSlug}$`));
    await expect(page.getByText('INDISPONÍVEL', { exact: true })).toBeVisible();
    await expect(page.getByText(/Indisponível no momento/)).toBeVisible();
  });

  test('a lista e a navegação do painel abrem', { tag: '@leitura' }, async ({ page }) => {
    await page.goto('/admin/produtos');
    await expect(page.getByRole('heading', { level: 1, name: 'Produtos' })).toBeVisible();
    await page
      .getByRole('link', { name: 'Categorias', exact: true })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/categorias$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeVisible();
  });
});

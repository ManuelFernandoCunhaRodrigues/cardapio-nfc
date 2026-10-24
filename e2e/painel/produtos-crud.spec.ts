import { expect, test, type AdminDb, type Page } from '../fixtures';

async function createProduct(page: Page, adminDb: AdminDb, name: string) {
  await page.goto('/admin/produtos/novo');
  await page.getByLabel('Nome do produto').fill(name);
  await page.getByLabel('Preço').fill('12,34');
  await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
  await page.getByRole('button', { name: 'Criar produto' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}\?criado=1$/);

  const productId = new URL(page.url()).pathname.split('/').pop();
  expect(productId).toMatch(/^[0-9a-f-]{36}$/);
  adminDb.track('products', productId!);
  const { data, error } = await adminDb.client
    .from('products')
    .select('slug')
    .eq('id', productId!)
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  return { id: productId!, slug: data!.slug };
}

async function saveProduct(page: Page) {
  await page.getByRole('button', { name: 'Salvar alterações' }).filter({ visible: true }).click();
  await expect(page.getByText('Produto atualizado com sucesso.')).toBeVisible();
}

test.describe('CRUD de produtos', () => {
  test('edita preço e descrição e mostra os dois no detalhe público', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const name = uniqueName('produto-editar');
    const description = `Descrição atualizada de ${uniqueName('produto')}`;
    const product = await createProduct(page, adminDb, name);

    await page.getByLabel('Preço').fill('19,87');
    await page.getByLabel('Descrição').fill(description);
    await saveProduct(page);

    await page.goto(`/produto/${product.slug}`);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText('R$ 19,87', { exact: true })).toBeVisible();
    await expect(page.getByText(description, { exact: true })).toBeVisible();
  });

  test('exclui e remove o produto da lista e da URL pública', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const name = uniqueName('produto-excluir');
    const product = await createProduct(page, adminDb, name);

    await page.goto('/admin/produtos');
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: `Mais ações para ${name}` }).click();
    await row.getByRole('button', { name: 'Excluir', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Excluir ${name}?` });
    await dialog.getByRole('button', { name: 'Excluir de vez' }).click();
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);

    const response = await page.goto(`/produto/${product.slug}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  });

  test('renomeia mantendo o endereço público antigo', async ({ page, adminDb, uniqueName }) => {
    const originalName = uniqueName('produto-nome-antigo');
    const updatedName = uniqueName('produto-nome-novo');
    const product = await createProduct(page, adminDb, originalName);

    await page.getByLabel('Nome do produto').fill(updatedName);
    await saveProduct(page);
    const { data, error } = await adminDb.client
      .from('products')
      .select('slug')
      .eq('id', product.id)
      .single();
    expect(error).toBeNull();
    expect(data?.slug).toBe(product.slug);

    await page.goto(`/produto/${product.slug}`);
    await expect(page).toHaveURL(new RegExp(`/produto/${product.slug}$`));
    await expect(page.getByRole('heading', { level: 1, name: updatedName })).toBeVisible();
  });
});

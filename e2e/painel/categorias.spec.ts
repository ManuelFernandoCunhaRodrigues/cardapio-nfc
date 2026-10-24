import { expect, test, type AdminDb, type Page } from '../fixtures';

async function createCategory(page: Page, adminDb: AdminDb, name: string) {
  await page.goto('/admin/categorias');
  await page.getByRole('button', { name: 'Nova', exact: true }).click();
  await page.getByLabel('Nome').fill(name);
  await page.getByRole('button', { name: 'Criar categoria' }).click();
  await expect(page.getByText('Categoria criada com sucesso.')).toBeVisible();

  const { data, error } = await adminDb.client
    .from('categories')
    .select('id')
    .eq('name', name)
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  adminDb.track('categories', data!.id);
  return data!.id;
}

async function publicCategoryOrder(page: Page) {
  await page.goto('/cardapio');
  return page
    .getByRole('navigation', { name: 'Categorias do cardápio' })
    .getByRole('link')
    .allTextContents();
}

test.describe('categorias do painel', () => {
  test('cria e mostra a categoria no painel e no cardápio', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const name = uniqueName('categoria-criar');
    await createCategory(page, adminDb, name);

    await expect(page.getByRole('article').filter({ hasText: name })).toBeVisible();
    await page.goto('/cardapio');
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  });

  test('edita e mantém a alteração após recarregar', async ({ page, adminDb, uniqueName }) => {
    const name = uniqueName('categoria-editar');
    const updatedName = uniqueName('categoria-editada');
    await createCategory(page, adminDb, name);

    const card = page.getByRole('article').filter({ hasText: name });
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByLabel('Nome').fill(updatedName);
    await page.getByRole('button', { name: 'Salvar categoria' }).click();
    await expect(page.getByText('Categoria atualizada com sucesso.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('article').filter({ hasText: updatedName })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  });

  test('reordena com Subir e Descer e muda a ordem pública', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const firstName = uniqueName('categoria-ordem-a');
    const secondName = uniqueName('categoria-ordem-b');
    await createCategory(page, adminDb, firstName);
    await createCategory(page, adminDb, secondName);
    const original = await publicCategoryOrder(page);
    expect(original.slice(-2)).toEqual([firstName, secondName]);

    await page.goto('/admin/categorias');
    await page.getByRole('button', { name: `Subir ${secondName}` }).click();
    await expect(page.getByText('Ordem da categoria atualizada.')).toBeVisible();
    expect((await publicCategoryOrder(page)).slice(-2)).toEqual([secondName, firstName]);

    await page.goto('/admin/categorias');
    await page.getByRole('button', { name: `Descer ${secondName}` }).click();
    await expect(page.getByText('Ordem da categoria atualizada.')).toBeVisible();
    expect((await publicCategoryOrder(page)).slice(-2)).toEqual([firstName, secondName]);
  });

  test('apaga uma categoria vazia após confirmação', async ({ page, adminDb, uniqueName }) => {
    const name = uniqueName('categoria-apagar');
    await createCategory(page, adminDb, name);

    const card = page.getByRole('article').filter({ hasText: name });
    await card.getByRole('button', { name: 'Excluir', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Excluir ${name}?` });
    await dialog.getByRole('button', { name: 'Excluir de vez' }).click();
    await expect(page.getByRole('article').filter({ hasText: name })).toHaveCount(0);
  });

  test('recusa apagar uma categoria com produto vinculado', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryName = uniqueName('categoria-vinculada');
    const productName = uniqueName('produto-vinculado');
    const categoryId = await createCategory(page, adminDb, categoryName);
    const { data: product, error } = await adminDb.client
      .from('products')
      .insert({ category_id: categoryId, name: productName, price_cents: 990 })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(product).not.toBeNull();
    adminDb.track('products', product!.id);

    const card = page.getByRole('article').filter({ hasText: categoryName });
    await card.getByRole('button', { name: 'Excluir', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Excluir ${categoryName}?` });
    await dialog.getByRole('button', { name: 'Excluir de vez' }).click();
    await expect(
      dialog.getByText(
        'Esta categoria possui produtos vinculados. Mova os produtos para outra categoria ou desative-a.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('article').filter({ hasText: categoryName })).toBeVisible();
  });
});

import path from 'node:path';

import { expect, test, type AdminDb, type Page } from '../fixtures';

const PHOTO_FILE = path.join(__dirname, '../arquivos/foto-teste.jpg');
// Imagem válida de 1 px: passa pelo navegador e a API recusa por ser menor que 400 px.
const TOO_SMALL_PHOTO = {
  name: 'foto-pequena.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
};

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

/** Segura a resposta da ordem no caminho até o servidor e conta quantos pedidos saíram. */
async function holdCategoryMoves(page: Page) {
  let requests = 0;
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/admin/categorias', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    requests += 1;
    await held;
    return route.continue();
  });
  return { requests: () => requests, release: () => release() };
}

async function chooseAndSavePhoto(page: Page, saveButton: string) {
  await page.getByRole('dialog').getByLabel('Escolher foto').setInputFiles(PHOTO_FILE);
  await expect(page.getByText('Foto pronta para salvar junto com a categoria.')).toBeVisible();
  await page.getByRole('button', { name: saveButton }).click();
  await expect(page.getByText('Foto otimizada e salva com sucesso.')).toBeVisible();
}

async function storedImagePath(adminDb: AdminDb, categoryId: string) {
  const { data, error } = await adminDb.client
    .from('categories')
    .select('image_path')
    .eq('id', categoryId)
    .single();
  expect(error).toBeNull();
  return data!.image_path;
}

async function createCategoryWithPhoto(page: Page, adminDb: AdminDb, name: string) {
  await page.goto('/admin/categorias');
  await page.getByRole('button', { name: 'Nova', exact: true }).click();
  await page.getByRole('dialog', { name: 'Nova categoria' }).getByLabel('Nome').fill(name);
  await chooseAndSavePhoto(page, 'Criar categoria');
  const { data, error } = await adminDb.client
    .from('categories')
    .select('id')
    .eq('name', name)
    .single();
  expect(error).toBeNull();
  adminDb.track('categories', data!.id);
  const imagePath = await storedImagePath(adminDb, data!.id);
  expect(imagePath).toMatch(new RegExp(`^categories/${data!.id}/`));
  return { id: data!.id, imagePath: imagePath! };
}

async function expectPhotoFiles(adminDb: AdminDb, imagePath: string, shouldExist: boolean) {
  for (const variant of ['detail', 'card']) {
    const { error } = await adminDb.client.storage
      .from('product-images')
      .download(`${imagePath}-${variant}.webp`);
    expect(error === null, `${imagePath}-${variant}.webp`).toBe(shouldExist);
  }
}

function homeCategoryPhoto(page: Page, imagePath: string) {
  return page
    .getByRole('navigation', { name: 'Categorias', exact: true })
    .locator(`img[src*="${imagePath}"]`);
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
    // Dentro do diálogo aberto: a gaveta da criação pode ainda estar saindo (inerte) no DOM.
    await page
      .getByRole('dialog', { name: 'Editar categoria' })
      .getByLabel('Nome')
      .fill(updatedName);
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

  test('rajada de cliques na lista mostra o andamento e move uma posição só', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const firstName = uniqueName('categoria-clique-a');
    const secondName = uniqueName('categoria-clique-b');
    await createCategory(page, adminDb, firstName);
    await createCategory(page, adminDb, secondName);

    await page.goto('/admin/categorias');
    const moves = await holdCategoryMoves(page);
    const moveUp = page.getByRole('button', { name: `Subir ${secondName}` });
    const otherItem = page.getByRole('button', { name: `Subir ${firstName}` });
    await moveUp.focus();
    // Cliques no mesmo instante, antes de a tela mostrar o andamento. Pelo DOM porque o clique do
    // Playwright espera o botão sair de aria-disabled, que é justamente o que se quer provar.
    await moveUp.evaluate((button: HTMLElement) => {
      button.click();
      button.click();
      button.click();
    });
    await expect(moveUp).toHaveAttribute('aria-busy', 'true');
    await expect(moveUp.getByTestId('quick-action-spinner')).toBeVisible();
    await expect(moveUp).toBeFocused();
    await expect(otherItem).toHaveAttribute('aria-disabled', 'true');
    await expect.poll(moves.requests).toBe(1);

    await otherItem.evaluate((button: HTMLElement) => button.click());
    await moveUp.press('Enter');
    moves.release();
    await expect(page.getByText('Ordem da categoria atualizada.')).toBeVisible();
    await expect(moveUp).toHaveAttribute('aria-busy', 'false');
    await expect(otherItem).toHaveAttribute('aria-disabled', 'false');
    await expect(moveUp).toBeFocused();
    // Um clique que tivesse entrado na fila sairia logo depois do primeiro.
    await page.waitForTimeout(1_000);
    expect(moves.requests()).toBe(1);
    expect((await publicCategoryOrder(page)).slice(-2)).toEqual([secondName, firstName]);
  });

  test('com menos animação, o botão em andamento não gira', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const firstName = uniqueName('categoria-calma-a');
    const secondName = uniqueName('categoria-calma-b');
    await createCategory(page, adminDb, firstName);
    await createCategory(page, adminDb, secondName);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/admin/categorias');
    const moves = await holdCategoryMoves(page);
    const moveUp = page.getByRole('button', { name: `Subir ${secondName}` });
    await moveUp.click();
    await expect(moveUp).toHaveAttribute('aria-busy', 'true');
    await expect(moveUp.getByTestId('quick-action-spinner')).toBeHidden();
    await expect(moveUp.locator('svg')).toBeVisible();
    moves.release();
    await expect(page.getByText('Ordem da categoria atualizada.')).toBeVisible();
  });

  test('envia, troca e remove a foto, que aparece no círculo da tela inicial', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    test.slow();
    const name = uniqueName('categoria-foto');
    const { id, imagePath } = await createCategoryWithPhoto(page, adminDb, name);
    await expectPhotoFiles(adminDb, imagePath, true);
    await page.goto('/');
    await expect(homeCategoryPhoto(page, imagePath)).toBeVisible();

    await page.goto('/admin/categorias');
    const card = page.getByRole('article').filter({ hasText: name });
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await chooseAndSavePhoto(page, 'Salvar categoria');
    const replacedPath = await storedImagePath(adminDb, id);
    expect(replacedPath).not.toBe(imagePath);
    await expectPhotoFiles(adminDb, imagePath, false);
    await expectPhotoFiles(adminDb, replacedPath!, true);

    await page.reload();
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByRole('button', { name: 'Remover foto' }).click();
    await page
      .getByRole('dialog', { name: 'Remover foto desta categoria?' })
      .getByRole('button', { name: 'Excluir de vez' })
      .click();
    await expect(page.getByText('Foto removida.')).toBeVisible();
    // O botão "Remover foto" some com a foto: o foco vai para o título da seção.
    await expect(page.getByRole('dialog').getByText('Foto da categoria')).toBeFocused();
    expect(await storedImagePath(adminDb, id)).toBeNull();
    await expectPhotoFiles(adminDb, replacedPath!, false);
    await page.goto('/');
    await expect(homeCategoryPhoto(page, replacedPath!)).toHaveCount(0);
  });

  test('mantém a categoria salva quando a foto falha e deixa tentar de novo', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    test.slow();
    const name = uniqueName('categoria-foto-falha');
    await page.goto('/admin/categorias');
    await page.getByRole('button', { name: 'Nova', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova categoria' });
    await dialog.getByLabel('Nome').fill(name);
    await dialog.getByLabel('Escolher foto').setInputFiles(TOO_SMALL_PHOTO);
    await expect(page.getByText('Foto pronta para salvar junto com a categoria.')).toBeVisible();
    await page.getByRole('button', { name: 'Criar categoria' }).click();

    await expect(
      page.getByText(
        'Categoria salva, mas a foto não foi enviada. Escolha uma foto com pelo menos 400 px no menor lado.',
      ),
    ).toBeVisible();
    const { data, error } = await adminDb.client
      .from('categories')
      .select('id, image_path')
      .eq('name', name)
      .single();
    expect(error).toBeNull();
    adminDb.track('categories', data!.id);
    expect(data!.image_path).toBeNull();

    await page
      .getByRole('article')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Editar', exact: true })
      .click();
    await chooseAndSavePhoto(page, 'Salvar categoria');
    expect(await storedImagePath(adminDb, data!.id)).toMatch(
      new RegExp(`^categories/${data!.id}/`),
    );
  });

  test('mantém a foto ao editar só o nome e apaga o arquivo ao excluir', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    test.slow();
    const name = uniqueName('categoria-foto-apagar');
    const updatedName = uniqueName('categoria-foto-editada');
    const { id, imagePath } = await createCategoryWithPhoto(page, adminDb, name);

    await page
      .getByRole('article')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Editar', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Editar categoria' })
      .getByLabel('Nome')
      .fill(updatedName);
    await page.getByRole('button', { name: 'Salvar categoria' }).click();
    await expect(page.getByText('Categoria atualizada com sucesso.')).toBeVisible();
    expect(await storedImagePath(adminDb, id)).toBe(imagePath);

    const card = page.getByRole('article').filter({ hasText: updatedName });
    await card.getByRole('button', { name: 'Excluir', exact: true }).click();
    await page
      .getByRole('dialog', { name: `Excluir ${updatedName}?` })
      .getByRole('button', { name: 'Excluir de vez' })
      .click();
    await expect(card).toHaveCount(0);
    await expectPhotoFiles(adminDb, imagePath, false);
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

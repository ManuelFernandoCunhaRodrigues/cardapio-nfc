import { expect, test, type AdminDb } from '../fixtures';

async function createCategory(adminDb: AdminDb, name: string) {
  const { data, error } = await adminDb.client
    .from('categories')
    .insert({ name, slug: name.toLowerCase(), sort_order: 9000 })
    .select('id')
    .single();
  expect(error).toBeNull();
  adminDb.track('categories', data!.id);
  return data!.id;
}

async function createProduct(adminDb: AdminDb, name: string, categoryId: string, active = true) {
  const { data, error } = await adminDb.client
    .from('products')
    .insert({ name, category_id: categoryId, price_cents: 700, is_active: active })
    .select('id, slug')
    .single();
  expect(error).toBeNull();
  adminDb.track('products', data!.id);
  return data!;
}

test.describe('gaveta com alterações', () => {
  test('pergunta antes de fechar e só descarta quando a pessoa confirma', async ({ page }) => {
    await page.goto('/admin/categorias');
    await page.getByRole('button', { name: 'Nova', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Nova categoria' });
    const name = sheet.getByLabel('Nome');
    await name.fill('Categoria que não foi salva');

    await page.keyboard.press('Escape');
    const question = page.getByRole('alertdialog', { name: 'Descartar alterações?' });
    await expect(question.getByRole('button', { name: 'Continuar editando' })).toBeFocused();
    await question.getByRole('button', { name: 'Continuar editando' }).click();
    await expect(question).toHaveCount(0);
    await expect(name).toHaveValue('Categoria que não foi salva');

    await sheet.getByRole('button', { name: 'Fechar' }).click();
    await question.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Cancelar com o formulário alterado também pergunta', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const name = uniqueName('cancelar-categoria');
    await createCategory(adminDb, name);
    await page.goto('/admin/categorias');
    await page
      .getByRole('article')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Editar', exact: true })
      .click();
    const sheet = page.getByRole('dialog', { name: 'Editar categoria' });
    await sheet.getByLabel('Nome').fill(`${name} mudado`);

    await sheet.getByRole('button', { name: 'Cancelar' }).click();
    const question = page.getByRole('alertdialog', { name: 'Descartar alterações?' });
    await expect(question).toHaveAccessibleDescription(
      'O que você mudou aqui ainda não foi salvo e será perdido.',
    );
    await question.getByRole('button', { name: 'Continuar editando' }).click();
    await expect(sheet.getByLabel('Nome')).toHaveValue(`${name} mudado`);

    await sheet.getByRole('button', { name: 'Cancelar' }).click();
    await question.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const { data, error } = await adminDb.client
      .from('categories')
      .select('name')
      .eq('name', name)
      .single();
    expect(error).toBeNull();
    expect(data!.name).toBe(name);
  });

  test('sem alteração, fecha sem perguntar', { tag: '@leitura' }, async ({ page }) => {
    await page.goto('/admin/destaques');
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Novo destaque' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });
});

test(
  'o Resumo tem atalho para o cardápio e mostra a loja hoje',
  { tag: '@leitura' },
  async ({ page }) => {
    await page.goto('/admin');
    const menuLink = page.getByRole('link', { name: 'Ver cardápio' }).filter({ visible: true });
    await expect(menuLink.first()).toHaveAttribute('href', '/cardapio');
    await expect(page.getByRole('heading', { level: 2, name: 'Loja hoje' })).toBeVisible();
    // No CI a página às vezes tem uma segunda cópia escondida do Resumo; só a visível conta.
    await expect(
      page.getByText('Em falta hoje', { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  },
);

test.describe('destino do destaque', () => {
  test('um produto grava o endereço pelo slug e o cartão mostra o destino', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryId = await createCategory(adminDb, uniqueName('destino-categoria'));
    const productName = uniqueName('destino-produto');
    const hiddenName = uniqueName('destino-escondido');
    const product = await createProduct(adminDb, productName, categoryId);
    await createProduct(adminDb, hiddenName, categoryId, false);
    const title = uniqueName('destino-destaque');

    await page.goto('/admin/destaques');
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo destaque' });
    await sheet.getByLabel('Título').fill(title);
    await sheet.getByText('Um produto', { exact: true }).click();
    await expect(sheet.getByRole('radio', { name: 'Um produto' })).toBeChecked();
    const select = sheet.getByLabel('Escolha o produto');
    // Só o que aparece no cardápio pode ser destino.
    await expect(select.locator('option', { hasText: hiddenName })).toHaveCount(0);
    await select.selectOption({ label: productName });
    await sheet.getByRole('button', { name: 'Criar destaque' }).click();
    await expect(page.getByText('Destaque criado com sucesso.')).toBeVisible();

    const { data, error } = await adminDb.client
      .from('highlights')
      .select('id, target')
      .eq('title', title)
      .single();
    expect(error).toBeNull();
    adminDb.track('highlights', data!.id);
    expect(data!.target).toBe(`/produto/${product.slug}`);
    await expect(
      page.getByRole('article').filter({ hasText: title }).getByText(`Leva para: ${productName}`),
    ).toBeVisible();
  });

  test('o cartão avisa quando o destino deixou de existir', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const title = uniqueName('destino-sumiu');
    const { data, error } = await adminDb.client
      .from('highlights')
      .insert({ title, target: '/cardapio#categoria-que-nao-existe-mais', is_active: false })
      .select('id')
      .single();
    expect(error).toBeNull();
    adminDb.track('highlights', data!.id);

    await page.goto('/admin/destaques');
    await expect(
      page
        .getByRole('article')
        .filter({ hasText: title })
        .getByText('O destino deste banner não existe mais. Edite o destaque e escolha outro.'),
    ).toBeVisible();
  });
});

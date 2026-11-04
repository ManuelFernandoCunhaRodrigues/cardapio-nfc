import { expect, test, type AdminDb, type Page } from '../fixtures';

function slugFromName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createCategory(adminDb: AdminDb, name: string) {
  const slug = slugFromName(name);
  const { data, error } = await adminDb.client
    .from('categories')
    .insert({ name, slug })
    .select('id, slug')
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  adminDb.track('categories', data!.id);
  return data!;
}

async function createProduct(
  adminDb: AdminDb,
  categoryId: string,
  name: string,
  options: { featured?: boolean; video?: boolean } = {},
) {
  const { data, error } = await adminDb.client
    .from('products')
    .insert({
      category_id: categoryId,
      name,
      price_cents: 1234,
      badge: options.featured ? 'mais_pedido' : null,
      video_path: options.video ? `e2e/${slugFromName(name)}.mp4` : null,
    })
    .select('id, slug, sort_order')
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  adminDb.track('products', data!.id);
  if (options.featured) {
    const { error: orderError } = await adminDb.client
      .from('products')
      .update({ sort_order: -1_000_000 })
      .eq('id', data!.id);
    expect(orderError).toBeNull();
  }
  return data!;
}

async function createHighlight(adminDb: AdminDb, title: string) {
  const { data, error } = await adminDb.client
    .from('highlights')
    .insert({ title, description: `Descrição de ${title}` })
    .select('id, sort_order')
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  adminDb.track('highlights', data!.id);
  return data!;
}

async function holdPosts(page: Page, path: string) {
  let requests = 0;
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    requests += 1;
    await held;
    return route.continue();
  });
  return { requests: () => requests, release: () => release() };
}

async function setProductSituation(
  page: Page,
  adminDb: AdminDb,
  productId: string,
  name: string,
  situation: 'menu' | 'unavailable' | 'hidden',
) {
  const control = page.getByLabel(`Situação de ${name}`).filter({ visible: true });
  await control.selectOption(situation);
  const expected = {
    menu: { is_active: true, is_available: true },
    unavailable: { is_active: true, is_available: false },
    hidden: { is_active: false, is_available: false },
  }[situation];
  await expect
    .poll(async () => {
      const { data, error } = await adminDb.client
        .from('products')
        .select('is_active, is_available')
        .eq('id', productId)
        .single();
      expect(error).toBeNull();
      return data;
    })
    .toEqual(expected);
  await expect(page.getByText('Situação do produto atualizada.')).toBeVisible();
}

async function expectProductOnPublicPages(page: Page, name: string, categorySlug: string) {
  await page.goto(`/?estado=${encodeURIComponent(name)}`);
  await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();

  await page.goto(`/cardapio?estado=${encodeURIComponent(name)}#${categorySlug}`);
  await expect(
    page.locator(`section#${categorySlug}`).getByRole('heading', { name }),
  ).toBeVisible();

  await page.goto('/busca');
  await page.getByRole('searchbox', { name: 'Buscar no cardápio' }).fill(name);
  await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
}

async function expectProductOffPublicPages(page: Page, name: string, categorySlug: string) {
  await page.goto(`/?estado=sem-${encodeURIComponent(name)}`);
  await expect(page.getByRole('heading', { level: 3, name, exact: true })).toHaveCount(0);

  await page.goto(`/cardapio?estado=sem-${encodeURIComponent(name)}#${categorySlug}`);
  await expect(page.locator(`section#${categorySlug}`).getByRole('heading', { name })).toHaveCount(
    0,
  );

  await page.goto('/busca');
  await page.getByRole('searchbox', { name: 'Buscar no cardápio' }).fill(name);
  await expect(page.getByRole('heading', { level: 3, name, exact: true })).toHaveCount(0);
}

test.describe('situações públicas e rajadas do painel', () => {
  test('percorre as três situações do produto e restaura o mesmo endereço', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const category = await createCategory(adminDb, uniqueName('categoria-situacoes'));
    const name = uniqueName('produto-situacoes');
    const product = await createProduct(adminDb, category.id, name, {
      featured: true,
      video: true,
    });

    await page.goto('/admin/produtos');
    await setProductSituation(page, adminDb, product.id, name, 'unavailable');
    await setProductSituation(page, adminDb, product.id, name, 'menu');

    await expectProductOnPublicPages(page, name, category.slug);
    await page.goto(`/produto/${product.slug}`);
    await expect(page.getByRole('button', { name: `Assistir vídeo de ${name}` })).toBeVisible();

    await page.goto('/admin/produtos');
    await setProductSituation(page, adminDb, product.id, name, 'unavailable');
    await page.goto(`/cardapio#${category.slug}`);
    await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
    await page.goto(`/produto/${product.slug}`);
    await expect(page.getByText('INDISPONÍVEL', { exact: true })).toBeVisible();
    await expect(page.getByText(/Indisponível no momento/)).toBeVisible();
    await expect(page.getByRole('button', { name: `Assistir vídeo de ${name}` })).toHaveCount(0);

    await page.goto('/admin/produtos');
    await setProductSituation(page, adminDb, product.id, name, 'hidden');
    await expectProductOffPublicPages(page, name, category.slug);
    const hiddenResponse = await page.goto(`/produto/${product.slug}`);
    expect(hiddenResponse?.status()).toBe(404);

    await page.goto('/admin/produtos');
    await setProductSituation(page, adminDb, product.id, name, 'menu');
    await expectProductOnPublicPages(page, name, category.slug);
    await page.goto(`/produto/${product.slug}`);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  });

  test('esconde a categoria com seus produtos e mostra os dois novamente', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryName = uniqueName('categoria-status');
    const category = await createCategory(adminDb, categoryName);
    const productName = uniqueName('produto-categoria');
    await createProduct(adminDb, category.id, productName, { featured: true });

    await page.goto('/admin/categorias');
    let card = page.getByRole('article').filter({ hasText: categoryName });
    await card.getByRole('button', { name: 'Esconder', exact: true }).click();
    await expect(page.getByText('Categoria escondida.')).toBeVisible();
    card = page.getByRole('article').filter({ hasText: categoryName });
    await card.getByRole('button', { name: 'Mostrar', exact: true }).click();
    await expect(page.getByText('Categoria visível.')).toBeVisible();
    await expectProductOnPublicPages(page, productName, category.slug);

    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Categorias', exact: true }).getByText(categoryName),
    ).toBeVisible();

    await page.goto('/admin/categorias');
    card = page.getByRole('article').filter({ hasText: categoryName });
    await card.getByRole('button', { name: 'Esconder', exact: true }).click();
    await expect(page.getByText('Categoria escondida.')).toBeVisible();
    await expectProductOffPublicPages(page, productName, category.slug);
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Categorias', exact: true }).getByText(categoryName),
    ).toHaveCount(0);

    await page.goto('/admin/categorias');
    card = page.getByRole('article').filter({ hasText: categoryName });
    await card.getByRole('button', { name: 'Mostrar', exact: true }).click();
    await expect(page.getByText('Categoria visível.')).toBeVisible();
    await expectProductOnPublicPages(page, productName, category.slug);
  });

  test('bloqueia a rajada em Produtos e move uma posição com um único POST', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const category = await createCategory(adminDb, uniqueName('categoria-rajada'));
    const firstName = uniqueName('produto-clique-a');
    const secondName = uniqueName('produto-clique-b');
    const first = await createProduct(adminDb, category.id, firstName);
    const second = await createProduct(adminDb, category.id, secondName);

    await page.goto('/admin/produtos');
    const moves = await holdPosts(page, '/admin/produtos');
    const moveUp = page
      .getByRole('button', { name: `Subir ${secondName}` })
      .filter({ visible: true });
    const otherItem = page
      .getByRole('button', { name: `Subir ${firstName}` })
      .filter({ visible: true });
    await moveUp.focus();
    await moveUp.evaluate((button: HTMLElement) => {
      button.click();
      button.click();
      button.click();
    });
    await expect(moveUp).toHaveAttribute('aria-busy', 'true');
    await expect(moveUp.getByTestId('quick-action-spinner')).toBeVisible();
    await expect(otherItem).toHaveAttribute('aria-disabled', 'true');
    await expect.poll(moves.requests).toBe(1);

    await otherItem.evaluate((button: HTMLElement) => button.click());
    moves.release();
    await expect(page.getByText('Ordem do produto atualizada.')).toBeVisible();
    await page.waitForTimeout(1_000);
    expect(moves.requests()).toBe(1);

    const { data, error } = await adminDb.client
      .from('products')
      .select('id, sort_order')
      .in('id', [first.id, second.id]);
    expect(error).toBeNull();
    const order = new Map(data!.map((item) => [item.id, item.sort_order]));
    expect(order.get(second.id)).toBeLessThan(order.get(first.id)!);
  });

  test('bloqueia a rajada em Destaques e move uma posição com um único POST', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const firstTitle = uniqueName('destaque-clique-a');
    const secondTitle = uniqueName('destaque-clique-b');
    const first = await createHighlight(adminDb, firstTitle);
    const second = await createHighlight(adminDb, secondTitle);

    await page.goto('/admin/destaques');
    const moves = await holdPosts(page, '/admin/destaques');
    const moveUp = page.getByRole('button', { name: `Subir ${secondTitle}` });
    const otherItem = page.getByRole('button', { name: `Subir ${firstTitle}` });
    await moveUp.focus();
    await moveUp.evaluate((button: HTMLElement) => {
      button.click();
      button.click();
      button.click();
    });
    await expect(moveUp).toHaveAttribute('aria-busy', 'true');
    await expect(moveUp.getByTestId('quick-action-spinner')).toBeVisible();
    await expect(otherItem).toHaveAttribute('aria-disabled', 'true');
    await expect.poll(moves.requests).toBe(1);

    await otherItem.evaluate((button: HTMLElement) => button.click());
    moves.release();
    await expect(page.getByText('Ordem atualizada.')).toBeVisible();
    await page.waitForTimeout(1_000);
    expect(moves.requests()).toBe(1);

    const { data, error } = await adminDb.client
      .from('highlights')
      .select('id, sort_order')
      .in('id', [first.id, second.id]);
    expect(error).toBeNull();
    const order = new Map(data!.map((item) => [item.id, item.sort_order]));
    expect(order.get(second.id)).toBeLessThan(order.get(first.id)!);
  });
});

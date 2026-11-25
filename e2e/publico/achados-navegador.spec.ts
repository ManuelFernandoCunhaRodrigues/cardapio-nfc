import { expect, test, type AdminDb, type Page } from '../fixtures';

async function expectInsideHorizontalViewport(page: Page, selector: string) {
  await expect
    .poll(() =>
      page.locator(selector).evaluate((element) => {
        const chip = element.getBoundingClientRect();
        const row = element.parentElement!.getBoundingClientRect();
        return chip.left >= row.left && chip.right <= row.right;
      }),
    )
    .toBe(true);
}

async function openNewProductWithVideo(page: Page, adminDb: AdminDb, name: string) {
  const slug = name.toLowerCase();
  const { data: category, error: categoryError } = await adminDb.client
    .from('categories')
    .insert({ name, slug })
    .select('id')
    .single();
  expect(categoryError).toBeNull();
  adminDb.track('categories', category!.id);
  const { data: product, error: productError } = await adminDb.client
    .from('products')
    .insert({
      category_id: category!.id,
      name,
      slug,
      price_cents: 1234,
      // O banco só aceita vídeo em produto com foto.
      image_path: `e2e/${slug}`,
      video_path: `e2e/${slug}.mp4`,
    })
    .select('id')
    .single();
  expect(productError).toBeNull();
  adminDb.track('products', product!.id);

  await page.goto(`/produto/${slug}`);
  return page.getByRole('button', { name: `Assistir vídeo de ${name}` });
}

async function expectAboveProductSheet(page: Page, selector: string) {
  await expect
    .poll(async () => {
      const element = await page.locator(selector).boundingBox();
      const sheet = await page.locator('main > section').boundingBox();
      if (!element || !sheet) return false;
      return element.y + element.height <= sheet.y + 1;
    })
    .toBe(true);
}

test.describe('achados dos testes no navegador', () => {
  test('mantém a categoria escolhida, marca a última no fim e mostra o chip ativo', async ({
    page,
  }) => {
    await page.goto('/cardapio');
    const navigation = page.getByRole('navigation', { name: 'Categorias do cardápio' });
    const links = navigation.getByRole('link');
    // O esqueleto do loading.tsx pode ficar na tela logo depois do goto: espera os chips chegarem.
    await expect(links.first()).toBeVisible();
    const categoryCount = await links.count();
    expect(categoryCount).toBeGreaterThan(1);

    const penultimate = links.nth(categoryCount - 2);
    const last = links.nth(categoryCount - 1);
    const penultimateHref = await penultimate.getAttribute('href');
    const lastHref = await last.getAttribute('href');
    expect(penultimateHref).toMatch(/^#[^#]+/);
    expect(lastHref).toMatch(/^#[^#]+/);

    await penultimate.click();
    await expect(penultimate).toHaveAttribute('aria-current', 'location');
    await expectInsideHorizontalViewport(page, `a[href="${penultimateHref}"]`);

    await last.click();
    await expect(last).toHaveAttribute('aria-current', 'location');
    await expectInsideHorizontalViewport(page, `a[href="${lastHref}"]`);

    await page.goto(`/cardapio${penultimateHref}`);
    await expect(
      page
        .getByRole('navigation', { name: 'Categorias do cardápio' })
        .getByRole('link')
        .nth(categoryCount - 2),
    ).toHaveAttribute('aria-current', 'location');

    await page.mouse.wheel(0, 100_000);
    await expect(
      page
        .getByRole('navigation', { name: 'Categorias do cardápio' })
        .getByRole('link')
        .nth(categoryCount - 1),
    ).toHaveAttribute('aria-current', 'location');
  });

  test('mantém o selo e os controles do vídeo acima da sobreposição', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const play = await openNewProductWithVideo(page, adminDb, uniqueName('produto-video'));
    const badge = page.getByText('VÍDEO CURTO · SEM SOM', { exact: true });
    await expect(badge).toBeVisible();
    await expectAboveProductSheet(page, '.lbl:has-text("VÍDEO CURTO · SEM SOM")');

    await play.click();
    await expect(page.locator('video[controls]')).toBeVisible();
    await expectAboveProductSheet(page, 'video[controls]');
  });

  test('trata espaços como busca vazia na tela e no endereço', async ({ page }) => {
    await page.goto('/busca');
    // Só os visíveis: na hidratação a lista do fallback e a do cliente convivem por um instante.
    const productLinks = page.locator('a[href^="/produto/"]').filter({ visible: true });
    await expect(productLinks.first()).toBeVisible();
    const initialProducts = await productLinks.count();

    await page.getByRole('searchbox', { name: 'Buscar no cardápio' }).fill('   ');

    await expect(page).toHaveURL(/\/busca$/);
    // Dentro do main: o aviso do fallback pode seguir no DOM durante a hidratação.
    await expect(
      page.getByRole('main').getByText('Escolha uma categoria ou digite o que procura'),
    ).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Categorias', exact: true })).toBeVisible();
    await expect(productLinks).toHaveCount(initialProducts);
  });

  test('usa títulos próprios nas páginas públicas', async ({ page }) => {
    for (const screen of [
      // O nome depois da barra é o cadastrado no painel (no banco de teste, "Salgaê Lanchonete").
      { path: '/cardapio', title: /^Cardápio \| Salgaê/ },
      { path: '/busca', title: /^Busca \| Salgaê/ },
      { path: '/info', title: /^Informações \| Salgaê/ },
    ]) {
      await page.goto(screen.path);
      await expect(page).toHaveTitle(screen.title);
    }
  });
});

import { expect, test, type Page } from '../fixtures';

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

async function openProductWithVideo(page: Page) {
  await page.goto('/cardapio');
  const productPaths = await page
    .locator('a[href^="/produto/"]')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute('href')).filter(Boolean)),
    ]);

  for (const path of productPaths) {
    await page.goto(path!);
    const play = page.getByRole('button', { name: /^Assistir vídeo de / });
    if (await play.count()) return play;
  }
  throw new Error('O cardápio precisa ter ao menos um produto público com vídeo para este teste.');
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

  test('mantém o selo e os controles do vídeo acima da sobreposição', async ({ page }) => {
    const play = await openProductWithVideo(page);
    const badge = page.getByText('VÍDEO CURTO · SEM SOM', { exact: true });
    await expect(badge).toBeVisible();
    await expectAboveProductSheet(page, '.lbl:has-text("VÍDEO CURTO · SEM SOM")');

    await play.click();
    await expect(page.locator('video[controls]')).toBeVisible();
    await expectAboveProductSheet(page, 'video[controls]');
  });

  test('trata espaços como busca vazia na tela e no endereço', async ({ page }) => {
    await page.goto('/busca');
    const productLinks = page.locator('a[href^="/produto/"]');
    const initialProducts = await productLinks.count();

    await page.getByRole('searchbox', { name: 'Buscar no cardápio' }).fill('   ');

    await expect(page).toHaveURL(/\/busca$/);
    await expect(page.getByText('Escolha uma categoria ou digite o que procura')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Atalhos de categoria' })).toBeVisible();
    await expect(productLinks).toHaveCount(initialProducts);
  });

  test('usa títulos próprios nas páginas públicas', async ({ page }) => {
    for (const screen of [
      { path: '/cardapio', title: 'Cardápio | Salgaê' },
      { path: '/busca', title: 'Busca | Salgaê' },
      { path: '/info', title: 'Informações | Salgaê' },
    ]) {
      await page.goto(screen.path);
      await expect(page).toHaveTitle(screen.title);
    }
  });
});

import { expect, test, type AdminDb, type Page } from '../fixtures';

async function signInAndCreateHighlights(page: Page, adminDb: AdminDb, titles: string[]) {
  await page.goto('/admin/login');
  await page.getByLabel('E-mail').fill(process.env.E2E_ADMIN_EMAIL ?? '');
  await page.getByLabel('Senha').fill(process.env.E2E_ADMIN_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  for (const title of titles) {
    await page.goto('/admin/destaques');
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    await page.getByLabel('TÃ­tulo').fill(title);
    await page.getByLabel('DescriÃ§Ã£o').fill(`DescriÃ§Ã£o de ${title}`);
    await page.getByRole('button', { name: 'Criar destaque' }).click();
    await expect(page.getByText('Destaque criado com sucesso.')).toBeVisible();
  }

  const { data, error } = await adminDb.client.from('highlights').select('id').in('title', titles);
  expect(error).toBeNull();
  data?.forEach((highlight) => adminDb.track('highlights', highlight.id));
}

test.describe('movimento pÃºblico', () => {
  test.describe('com movimento reduzido', () => {
    test.use({ reducedMotion: 'reduce' });

    test('troca o slide, deixa cards visÃ­veis e posiciona o indicador sem transiÃ§Ã£o', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      await signInAndCreateHighlights(page, adminDb, [
        uniqueName('motion-a'),
        uniqueName('motion-b'),
      ]);
      await page.goto('/');
      const carousel = page.getByRole('region', { name: 'Destaques da casa' });
      await carousel.getByRole('button', { name: /Ir para destaque 2 de/ }).click();
      const activeSlide = carousel.locator('[role="group"][aria-hidden="false"]');
      await expect(activeSlide).toBeVisible();
      expect(await activeSlide.evaluate((element) => getComputedStyle(element).transform)).toBe(
        'none',
      );

      await page.goto('/cardapio');
      expect(
        await page
          .locator('section [role="list"] > div')
          .first()
          .evaluate((element) => getComputedStyle(element).opacity),
      ).toBe('1');
      const menuLink = page
        .getByRole('navigation', { name: 'NavegaÃ§Ã£o principal' })
        .getByRole('link', { name: 'CardÃ¡pio' });
      await expect(menuLink).toHaveAttribute('aria-current', 'page');
      expect(
        await menuLink
          .locator('span')
          .nth(1)
          .evaluate((element) => getComputedStyle(element).backgroundColor),
      ).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('sem reduÃ§Ã£o', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('arrasta o carrossel, pausa ao passar o mouse e anima busca e cards atÃ© o estado final', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      await signInAndCreateHighlights(page, adminDb, [uniqueName('drag-a'), uniqueName('drag-b')]);
      await page.clock.install();
      await page.goto('/');
      const carousel = page.getByRole('region', { name: 'Destaques da casa' });
      const track = carousel.locator('div').first();
      const box = await track.boundingBox();
      if (!box) throw new Error('Trilha do carrossel sem dimensÃµes.');
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 6 });
      await page.mouse.up();
      await expect(carousel.locator('[role="group"][aria-hidden="false"]')).toHaveAttribute(
        'aria-label',
        '2 de 2',
      );
      await carousel.hover();
      await page.clock.fastForward(6_100);
      await expect(carousel.locator('[role="group"][aria-hidden="false"]')).toHaveAttribute(
        'aria-label',
        '2 de 2',
      );

      await page.goto('/busca');
      const search = page.getByRole('searchbox', { name: 'Buscar no cardÃ¡pio' });
      await search.fill('pastel');
      await expect(page.getByRole('link', { name: /^Pastel de carne/ })).toBeVisible();
      await search.fill('');
      await expect(page.getByText('Categorias', { exact: true })).toBeVisible();
      expect(
        await page
          .locator('section [role="list"] > div')
          .first()
          .evaluate((element) => getComputedStyle(element).opacity),
      ).toBe('1');
    });
  });
});

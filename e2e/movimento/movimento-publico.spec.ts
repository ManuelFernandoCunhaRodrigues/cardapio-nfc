import { expect, test, type AdminDb, type Page } from '../fixtures';

// Criados pelo painel (e não direto no banco) para a etiqueta do cardápio ser invalidada.
async function createHighlights(page: Page, adminDb: AdminDb, titles: string[]) {
  for (const title of titles) {
    await page.goto('/admin/destaques');
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Descrição').fill(`Descrição de ${title}`);
    await page.getByRole('button', { name: 'Criar destaque' }).click();
    await expect(page.getByText('Destaque criado com sucesso.')).toBeVisible();
  }

  const { data, error } = await adminDb.client.from('highlights').select('id').in('title', titles);
  expect(error).toBeNull();
  data?.forEach((highlight) => adminDb.track('highlights', highlight.id));
}

function carousel(page: Page) {
  return page.getByRole('region', { name: 'Destaques da casa' });
}

function activeSlide(page: Page) {
  return carousel(page).locator('[role="group"][aria-hidden="false"]');
}

function carouselTrack(page: Page) {
  return carousel(page).locator('> div').first();
}

function firstMenuCard(page: Page) {
  return page
    .getByRole('list', { name: /^Produtos de / })
    .first()
    .locator('> div')
    .first();
}

function menuNavigationLink(page: Page) {
  return page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Cardápio' });
}

test.describe('movimento público com movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('troca de destaque pelos pontos sem deslocar a trilha', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    await createHighlights(page, adminDb, [uniqueName('reduzido-a'), uniqueName('reduzido-b')]);
    await page.goto('/');

    await page.getByRole('button', { name: /^Ir para destaque 2 de/ }).click();

    await expect(activeSlide(page)).toHaveAttribute('aria-label', /^2 de/);
    await expect(carouselTrack(page)).toHaveCSS('transform', 'none');
  });

  test('mostra os cards do cardápio já no lugar', async ({ page }) => {
    await page.goto('/cardapio');

    await expect(firstMenuCard(page)).toHaveCSS('opacity', '1');
    await expect(firstMenuCard(page)).toHaveCSS('transform', 'none');
  });

  test('marca a aba ativa da barra inferior', async ({ page }) => {
    await page.goto('/cardapio');

    await expect(menuNavigationLink(page)).toHaveAttribute('aria-current', 'page');
    await expect(menuNavigationLink(page).locator('.bg-peach')).toHaveCount(1);
  });
});

test.describe('movimento público sem redução', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('troca de destaque ao arrastar com o mouse sem abrir o link', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    await createHighlights(page, adminDb, [uniqueName('arrasto-a'), uniqueName('arrasto-b')]);
    await page.goto('/');
    const box = await activeSlide(page).boundingBox();
    if (!box) throw new Error('Slide ativo sem dimensões.');

    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(page).toHaveURL(/\/$/);
    await expect(activeSlide(page)).toHaveAttribute('aria-label', /^2 de/);
    await expect(carouselTrack(page)).toHaveCSS('transform', 'none');
  });

  test('não troca de destaque com o mouse sobre o carrossel', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    await createHighlights(page, adminDb, [uniqueName('pausa-a'), uniqueName('pausa-b')]);
    await page.clock.install();
    await page.goto('/');
    await expect(activeSlide(page)).toHaveAttribute('aria-label', /^1 de/);

    await carousel(page).hover();
    await page.clock.fastForward(6_100);

    await expect(activeSlide(page)).toHaveAttribute('aria-label', /^1 de/);
  });

  test('termina a entrada dos cards do cardápio visíveis e no lugar', async ({ page }) => {
    await page.goto('/cardapio');

    await expect(firstMenuCard(page)).toHaveCSS('opacity', '1');
    await expect(firstMenuCard(page)).toHaveCSS('transform', 'none');
  });

  test('troca os resultados da busca até o estado final', async ({ page }) => {
    await page.goto('/busca');
    const search = page.getByRole('searchbox', { name: 'Buscar no cardápio' });

    await search.fill('pastel');
    await expect(page.getByRole('link', { name: /^Pastel de carne/ })).toBeVisible();

    await search.fill('');
    await expect(page.getByText('Categorias', { exact: true })).toBeVisible();
  });
});

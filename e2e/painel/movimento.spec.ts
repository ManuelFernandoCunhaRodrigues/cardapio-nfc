import { expect, test, type AdminDb, type Page } from '../fixtures';

async function createHighlight(page: Page, adminDb: AdminDb, title: string) {
  await page.goto('/admin/destaques');
  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Descrição').fill(`Descrição de ${title}`);
  await page.getByRole('button', { name: 'Criar destaque' }).click();
  await expect(page.getByText('Destaque criado com sucesso.')).toBeVisible();

  const { data, error } = await adminDb.client
    .from('highlights')
    .select('id')
    .eq('title', title)
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  adminDb.track('highlights', data!.id);
}

async function prepareCarousel(page: Page, adminDb: AdminDb, titles: [string, string]) {
  await createHighlight(page, adminDb, titles[0]);
  await createHighlight(page, adminDb, titles[1]);
  await page.clock.install();
  await page.goto('/');
  const carousel = page.getByRole('region', { name: 'Destaques da casa' });
  await expect(carousel.getByRole('group', { includeHidden: true })).toHaveCount(2);
  await expect(carousel.getByRole('button', { name: 'Ir para destaque 1 de 2' })).toBeVisible();
  return carousel.locator('[role="group"][aria-hidden="false"]');
}

test.describe('movimento do carrossel', () => {
  test.describe('com movimento reduzido', () => {
    test.use({ reducedMotion: 'reduce' });

    test('não troca de destaque sozinho', async ({ page, adminDb, uniqueName }) => {
      const active = await prepareCarousel(page, adminDb, [
        uniqueName('movimento-reduzido-a'),
        uniqueName('movimento-reduzido-b'),
      ]);
      const initialLabel = await active.getAttribute('aria-label');

      await page.clock.fastForward(12_100);

      await expect(active).toHaveAttribute('aria-label', initialLabel!);
    });
  });

  test.describe('sem movimento reduzido', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('troca de destaque após o intervalo', async ({ page, adminDb, uniqueName }) => {
      const active = await prepareCarousel(page, adminDb, [
        uniqueName('movimento-normal-a'),
        uniqueName('movimento-normal-b'),
      ]);
      const initialLabel = await active.getAttribute('aria-label');

      await page.clock.fastForward(6_100);

      await expect(active).not.toHaveAttribute('aria-label', initialLabel!);
    });
  });
});

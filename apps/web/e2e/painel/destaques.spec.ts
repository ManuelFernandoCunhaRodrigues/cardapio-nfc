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
  return data!.id;
}

async function carouselTitles(page: Page) {
  const carousel = page.getByRole('region', { name: 'Destaques da casa' });
  return carousel.getByRole('heading', { level: 2, includeHidden: true }).allTextContents();
}

async function panelTitles(page: Page) {
  const labels = await page
    .getByRole('button', { name: /^Editar / })
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''));
  return labels.map((label) => label.replace(/^Editar /, ''));
}

test.describe('destaques do painel', () => {
  test('cria e mostra o destaque no carrossel', async ({ page, adminDb, uniqueName }) => {
    const title = uniqueName('destaque-criar');
    await createHighlight(page, adminDb, title);

    await expect(page.getByRole('article').filter({ hasText: title })).toBeVisible();
    await page.goto('/');
    const carousel = page.getByRole('region', { name: 'Destaques da casa' });
    await expect(
      carousel.getByRole('heading', { level: 2, name: title, includeHidden: true }),
    ).toBeAttached();
  });

  test('desativa e ativa em novas navegações públicas', async ({ page, adminDb, uniqueName }) => {
    const title = uniqueName('destaque-status');
    await createHighlight(page, adminDb, title);

    await page.goto(`/?estado=ativo-${encodeURIComponent(title)}`);
    await expect(
      page
        .getByRole('region', { name: 'Destaques da casa' })
        .getByRole('heading', { name: title, includeHidden: true }),
    ).toBeAttached();

    await page.goto('/admin/destaques');
    let card = page.getByRole('article').filter({ hasText: title });
    await card.getByRole('button', { name: 'Esconder', exact: true }).click();
    await expect(page.getByText('Destaque desativado.')).toBeVisible();
    await page.goto(`/?estado=inativo-${encodeURIComponent(title)}`);
    await expect(
      page
        .getByRole('region', { name: 'Destaques da casa' })
        .getByRole('heading', { name: title, includeHidden: true }),
    ).toHaveCount(0);

    await page.goto('/admin/destaques');
    card = page.getByRole('article').filter({ hasText: title });
    await card.getByRole('button', { name: 'Mostrar', exact: true }).click();
    await expect(page.getByText('Destaque ativado.')).toBeVisible();
    await page.goto(`/?estado=reativo-${encodeURIComponent(title)}`);
    await expect(
      page
        .getByRole('region', { name: 'Destaques da casa' })
        .getByRole('heading', { name: title, includeHidden: true }),
    ).toBeAttached();
  });

  test('reordena no painel e nos slides mantendo só o ativo exposto', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const firstTitle = uniqueName('destaque-ordem-a');
    const secondTitle = uniqueName('destaque-ordem-b');
    await createHighlight(page, adminDb, firstTitle);
    await createHighlight(page, adminDb, secondTitle);

    await page.goto('/');
    const publicBefore = await carouselTitles(page);
    expect(publicBefore.slice(-2)).toEqual([firstTitle, secondTitle]);

    await page.goto('/admin/destaques');
    const panelBefore = await panelTitles(page);
    expect(panelBefore.slice(-2)).toEqual([firstTitle, secondTitle]);
    await page.getByRole('button', { name: `Subir ${secondTitle}` }).click();
    await expect(page.getByText('Ordem atualizada.')).toBeVisible();
    expect((await panelTitles(page)).slice(-2)).toEqual([secondTitle, firstTitle]);

    await page.goto('/');
    const carousel = page.getByRole('region', { name: 'Destaques da casa' });
    await carousel.hover();
    const publicAfter = await carouselTitles(page);
    expect(publicAfter.slice(-2)).toEqual([secondTitle, firstTitle]);

    const activeSlides = carousel.locator('[role="group"][aria-hidden="false"]');
    const hiddenSlides = carousel.locator('[role="group"][aria-hidden="true"]');
    await expect(activeSlides).toHaveCount(1);
    await expect(activeSlides).toBeVisible();
    await expect(carousel.getByRole('group')).toHaveCount(1);
    await expect(hiddenSlides).toHaveCount(publicAfter.length - 1);
    expect(
      await hiddenSlides.evaluateAll((items) => items.every((item) => item.hasAttribute('inert'))),
    ).toBe(true);
  });
});

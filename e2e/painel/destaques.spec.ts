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
  return page
    .getByRole('button', { name: /^Editar / })
    .evaluateAll((buttons) =>
      buttons.map((button) => button.querySelector('strong')?.textContent ?? ''),
    );
}

async function storedHighlightImage(adminDb: AdminDb, highlightId: string) {
  const { data, error } = await adminDb.client
    .from('highlights')
    .select('image_path')
    .eq('id', highlightId)
    .single();
  expect(error).toBeNull();
  return data!.image_path;
}

test.describe('destaques do painel', () => {
  test('salva com foto, avisa quando a foto falha e remove devolvendo o foco', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    test.slow();
    const title = uniqueName('destaque-foto');
    const id = await createHighlight(page, adminDb, title);
    const card = page.getByRole('article').filter({ hasText: title });
    const editor = page.getByRole('dialog', { name: 'Editar destaque' });

    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await editor.getByLabel('Escolher foto').setInputFiles(TOO_SMALL_PHOTO);
    await expect(page.getByText('Foto pronta para salvar junto com o destaque.')).toBeVisible();
    await page.getByRole('button', { name: 'Salvar destaque' }).click();
    await expect(
      page.getByText('Escolha uma foto com pelo menos 400 px no menor lado.'),
    ).toBeVisible();
    expect(await storedHighlightImage(adminDb, id)).toBeNull();

    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await editor.getByLabel('Escolher foto').setInputFiles(PHOTO_FILE);
    await expect(page.getByText('Foto pronta para salvar junto com o destaque.')).toBeVisible();
    await page.getByRole('button', { name: 'Salvar destaque' }).click();
    await expect(page.getByText('Foto otimizada e salva com sucesso.')).toBeVisible();
    expect(await storedHighlightImage(adminDb, id)).toMatch(new RegExp(`^highlights/${id}/`));

    await page.reload();
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await editor.getByRole('button', { name: 'Remover foto' }).click();
    await page
      .getByRole('dialog', { name: 'Remover foto deste destaque?' })
      .getByRole('button', { name: 'Excluir de vez' })
      .click();
    await expect(page.getByText('Foto removida.')).toBeVisible();
    await expect(editor.getByText('Foto do banner')).toBeFocused();
    expect(await storedHighlightImage(adminDb, id)).toBeNull();
  });

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

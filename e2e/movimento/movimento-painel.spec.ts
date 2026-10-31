import { expect, test, type AdminDb, type Page } from '../fixtures';

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
  adminDb.track('categories', data!.id);
}

function categoryCard(page: Page, name: string) {
  return page.getByRole('article').filter({ hasText: name });
}

// O que já saiu da tela não pode continuar no DOM (nem escondido).
function anyDialogInDom(page: Page) {
  return page.locator('[role="dialog"]');
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test.describe(`movimento do painel (${reducedMotion})`, () => {
    test.use({ reducedMotion });

    test('a gaveta fecha com Escape, some do DOM e devolve o foco ao botão', async ({ page }) => {
      await page.goto('/admin/categorias');
      const openButton = page.getByRole('button', { name: 'Nova', exact: true });

      await openButton.click();
      await expect(page.getByRole('dialog', { name: 'Nova categoria' })).toBeVisible();
      await page.keyboard.press('Escape');

      await expect(anyDialogInDom(page)).toHaveCount(0);
      await expect(openButton).toBeFocused();
    });

    test('reabrir a gaveta durante a saída deixa um só diálogo acessível', async ({ page }) => {
      await page.goto('/admin/categorias');
      const openButton = page.getByRole('button', { name: 'Nova', exact: true });

      await openButton.click();
      await page.getByRole('dialog', { name: 'Nova categoria' }).getByLabel('Fechar').click();
      await openButton.click();

      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(anyDialogInDom(page)).toHaveCount(1);
    });

    test('a confirmação fecha ao cancelar e devolve o foco ao gatilho', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      const name = uniqueName('motion-confirmar');
      await createCategory(page, adminDb, name);
      const trigger = categoryCard(page, name).getByRole('button', {
        name: 'Excluir',
        exact: true,
      });

      await trigger.click();
      const dialog = page.getByRole('dialog', { name: `Excluir ${name}?` });
      await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
      await dialog.getByRole('button', { name: 'Cancelar' }).click();

      await expect(anyDialogInDom(page)).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test('o aviso de resultado termina visível por inteiro', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      await createCategory(page, adminDb, uniqueName('motion-aviso'));

      await expect(page.getByRole('status').filter({ hasText: 'Categoria criada' })).toHaveCSS(
        'opacity',
        '1',
      );
    });

    test('a categoria reordenada termina no lugar novo, sem deslocamento', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      const firstName = uniqueName('motion-ordem-a');
      const secondName = uniqueName('motion-ordem-b');
      await createCategory(page, adminDb, firstName);
      await createCategory(page, adminDb, secondName);

      await page.getByRole('button', { name: `Subir ${secondName}` }).click();
      await expect(page.getByText('Ordem da categoria atualizada.')).toBeVisible();

      await expect
        .poll(async () => {
          const cards = await page.getByRole('article').allTextContents();
          return (
            cards.findIndex((text) => text.includes(secondName)) <
            cards.findIndex((text) => text.includes(firstName))
          );
        })
        .toBe(true);
      await expect(categoryCard(page, secondName)).toHaveCSS('transform', 'none');
      await expect(categoryCard(page, firstName)).toHaveCSS('transform', 'none');
    });
  });
}

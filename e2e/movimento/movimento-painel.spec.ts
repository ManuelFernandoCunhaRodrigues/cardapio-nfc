import { expect, test, type AdminDb, type Page } from '../fixtures';

// Destaque com foto direto no banco: o editor mostra "Remover foto", uma confirmação que abre
// sobre a gaveta. A imagem não precisa existir no Storage para isso.
async function insertHighlightWithPhoto(adminDb: AdminDb, title: string) {
  const { data, error } = await adminDb.client
    .from('highlights')
    .insert({ title, image_path: `e2e/${title}.webp`, is_active: false })
    .select('id')
    .single();
  expect(error).toBeNull();
  adminDb.track('highlights', data!.id);
}

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

    // No celular, o formulário do destaque é o mais longo das gavetas: o botão do fim tem de ser
    // alcançável e clicável (QA-03).
    test('a gaveta do destaque chega até o botão Criar destaque', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      const title = uniqueName('motion-gaveta-longa');
      await page.goto('/admin/destaques');
      await page.getByRole('button', { name: 'Novo', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Novo destaque' });
      await sheet.getByLabel('Título').fill(title);
      await sheet.getByLabel('Descrição').fill(`Descrição de ${title}`);

      await sheet.getByRole('button', { name: 'Criar destaque' }).click();

      await expect(page.getByText('Destaque criado com sucesso.')).toBeVisible();
      const { data, error } = await adminDb.client
        .from('highlights')
        .select('id')
        .eq('title', title)
        .single();
      expect(error).toBeNull();
      adminDb.track('highlights', data!.id);
    });

    test('reabrir a gaveta durante a saída deixa um só diálogo acessível', async ({ page }) => {
      await page.goto('/admin/categorias');
      const openButton = page.getByRole('button', { name: 'Nova', exact: true });

      await openButton.click();
      await expect(page.getByRole('dialog', { name: 'Nova categoria' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(openButton).toBeFocused();
      // Pelo teclado, a reabertura não espera a camada que está saindo sumir.
      await page.keyboard.press('Enter');

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

    test('excluir devolve o foco ao título da página quando o gatilho some', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      const name = uniqueName('motion-excluir');
      await createCategory(page, adminDb, name);

      await categoryCard(page, name).getByRole('button', { name: 'Excluir', exact: true }).click();
      await page
        .getByRole('dialog', { name: `Excluir ${name}?` })
        .getByRole('button', { name: 'Excluir de vez' })
        .click();

      await expect(categoryCard(page, name)).toHaveCount(0);
      await expect(anyDialogInDom(page)).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeFocused();
    });

    test('Escape na confirmação aberta sobre a gaveta fecha só a confirmação', async ({
      page,
      adminDb,
      uniqueName,
    }) => {
      const title = uniqueName('motion-camadas');
      await insertHighlightWithPhoto(adminDb, title);
      await page.goto('/admin/destaques');
      await page
        .getByRole('article')
        .filter({ hasText: title })
        .getByRole('button', { name: 'Editar', exact: true })
        .click();
      const editor = page.getByRole('dialog', { name: 'Editar destaque' });
      const removePhoto = editor.getByRole('button', { name: 'Remover foto' });

      await removePhoto.click();
      await expect(
        page.getByRole('dialog', { name: 'Remover foto deste destaque?' }),
      ).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await page.keyboard.press('Escape');

      await expect(page.getByRole('dialog', { name: 'Remover foto deste destaque?' })).toHaveCount(
        0,
      );
      await expect(editor).toBeVisible();
      await expect(removePhoto).toBeFocused();
    });
  });
}

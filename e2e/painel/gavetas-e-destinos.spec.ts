import { expect, test } from '../fixtures';

test.describe('gaveta com alterações', () => {
  test('pergunta antes de fechar e só descarta quando a pessoa confirma', async ({ page }) => {
    await page.goto('/admin/categorias');
    await page.getByRole('button', { name: 'Nova', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Nova categoria' });
    const name = sheet.getByLabel('Nome');
    await name.fill('Categoria que não foi salva');

    await page.keyboard.press('Escape');
    const question = page.getByRole('alertdialog', { name: 'Descartar alterações?' });
    await expect(question.getByRole('button', { name: 'Continuar editando' })).toBeFocused();
    await question.getByRole('button', { name: 'Continuar editando' }).click();
    await expect(question).toHaveCount(0);
    await expect(name).toHaveValue('Categoria que não foi salva');

    await sheet.getByRole('button', { name: 'Fechar' }).click();
    await question.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('sem alteração, fecha sem perguntar', { tag: '@leitura' }, async ({ page }) => {
    await page.goto('/admin/destaques');
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Novo destaque' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });
});

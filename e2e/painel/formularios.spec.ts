import { expect, test, type AdminDb, type Page } from '../fixtures';

async function createProduct(page: Page, adminDb: AdminDb, name: string) {
  await page.goto('/admin/produtos/novo');
  await page.getByLabel('Nome do produto').fill(name);
  await page.getByLabel('Preço').fill('11,20');
  await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
  await page.getByRole('button', { name: 'Criar produto' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}\?criado=1$/);
  const productId = new URL(page.url()).pathname.split('/').pop();
  expect(productId).toMatch(/^[0-9a-f-]{36}$/);
  adminDb.track('products', productId!);
  return productId!;
}

test.describe('formulários do painel', () => {
  test('avisa antes de voltar sem salvar a edição', async ({ page, adminDb, uniqueName }) => {
    const name = uniqueName('produto-saida');
    const productId = await createProduct(page, adminDb, name);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByLabel('Descrição').fill(uniqueName('alteracao-nao-salva'));

    const dialogPromise = page.waitForEvent('dialog');
    const clickPromise = page
      .getByRole('button', { name: 'Voltar para produtos' })
      .filter({ visible: true })
      .click();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe('Sair sem salvar as alterações?');
    await dialog.dismiss();
    await clickPromise;
    await expect(page).toHaveURL(new RegExp(`/admin/produtos/${productId}`));
  });

  test('marca nome e preço inválidos com descrição acessível', async ({ page, uniqueName }) => {
    await page.goto('/admin/produtos/novo');
    await page.getByLabel('Nome do produto').fill('X');
    await page.getByLabel('Preço').fill('preço inválido');
    await page.getByLabel('Descrição').fill(uniqueName('formulario-invalido'));
    await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
    await page.getByRole('button', { name: 'Criar produto' }).filter({ visible: true }).click();

    const name = page.getByLabel('Nome do produto');
    const price = page.getByLabel('Preço');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('Informe o nome do produto.');
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(price).toHaveAccessibleDescription('Informe um preço válido, como R$ 8,90.');
    await expect(page.getByText('Informe o nome do produto.', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Informe um preço válido, como R$ 8,90.', { exact: true }),
    ).toBeVisible();
  });
});

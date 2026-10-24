import { expect, test, type AdminDb, type Page } from '../fixtures';

async function createProduct(page: Page, adminDb: AdminDb, name: string) {
  await page.goto('/admin/produtos/novo');
  await page.getByRole('textbox', { name: 'Nome do produto', exact: true }).fill(name);
  await page.getByRole('textbox', { name: 'Preço' }).fill('11,20');
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
    await page.getByRole('textbox', { name: 'Descrição' }).fill(uniqueName('alteracao-nao-salva'));

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

  // O servidor só confere o preço depois que o nome passa na validação: os erros aparecem um de
  // cada vez.
  test('marca nome e depois preço inválidos com descrição acessível', async ({
    page,
    uniqueName,
  }) => {
    await page.goto('/admin/produtos/novo');
    const name = page.getByRole('textbox', { name: 'Nome do produto', exact: true });
    const price = page.getByRole('textbox', { name: 'Preço' });
    const submit = page.getByRole('button', { name: 'Criar produto' }).filter({ visible: true });

    await name.fill('X');
    await price.fill('preço inválido');
    await page.getByRole('textbox', { name: 'Descrição' }).fill(uniqueName('formulario-invalido'));
    await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
    await submit.click();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('Informe o nome do produto.');
    await expect(page.getByText('Informe o nome do produto.', { exact: true })).toBeVisible();

    await name.fill(uniqueName('formulario-preco'));
    await submit.click();
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(price).toHaveAccessibleDescription('Informe um preço válido, como R$ 8,90.');
    // A mensagem do preço aparece no campo e no aviso geral do formulário.
    await expect(page.locator('#product-price-error')).toHaveText(
      'Informe um preço válido, como R$ 8,90.',
    );
    await expect(page.getByRole('alert')).toHaveText('Informe um preço válido, como R$ 8,90.');
    await expect(page).toHaveURL(/\/admin\/produtos\/novo/);
  });
});

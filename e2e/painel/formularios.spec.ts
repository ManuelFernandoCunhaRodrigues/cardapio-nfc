import { expect, test, withStoreSettingsRestored, type AdminDb, type Page } from '../fixtures';

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

  // Os botões de situação não disparam `change`: "alterado" vem da comparação com o salvo.
  test('avisa ao voltar depois de trocar só a situação e não avisa ao desfazer', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    await createProduct(page, adminDb, uniqueName('produto-situacao'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const back = page.getByRole('button', { name: 'Voltar para produtos' });
    await page.getByRole('button', { name: /Em falta hoje/ }).click();

    const dialogPromise = page.waitForEvent('dialog');
    const clickPromise = back.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Sair sem salvar as alterações?');
    await dialog.dismiss();
    await clickPromise;

    await page.getByRole('button', { name: /No cardápio/ }).click();
    await back.click();
    await expect(page).toHaveURL(/\/admin\/produtos$/);
  });

  // O editor confere os campos com o schema da API antes de enviar: todos os erros aparecem de
  // uma vez, o foco vai ao primeiro e o quadro de etapas da criação não aparece.
  test('aponta nome e preço inválidos antes de enviar, com foco e descrição acessível', async ({
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
    await expect(name).toBeFocused();
    await expect(name).toHaveAccessibleDescription('Informe o nome do produto.');
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(price).toHaveAccessibleDescription('Informe um preço válido, como R$ 8,90.');
    await expect(page.getByText('Não foi possível concluir esta etapa.')).toBeHidden();
    // O Next também tem um `role="alert"` (anunciador de rotas): filtra pelo texto.
    await expect(
      page.getByRole('alert').filter({ hasText: 'Revise os campos destacados antes de salvar.' }),
    ).toBeVisible();

    await name.fill(uniqueName('formulario-preco'));
    await submit.click();
    await expect(name).toHaveAttribute('aria-invalid', 'false');
    await expect(price).toBeFocused();
    await expect(page.locator('#product-price-error')).toHaveText(
      'Informe um preço válido, como R$ 8,90.',
    );
    await expect(page).toHaveURL(/\/admin\/produtos\/novo/);
  });

  // O React 19 reinicia os campos não controlados quando a action termina, mesmo com erro: o
  // formulário precisa voltar ao que foi digitado, e não ao valor salvo.
  test('erro de validação na Loja mantém o que foi digitado nos outros campos', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    await withStoreSettingsRestored(adminDb, async (settings) => {
      // Parte de "auto" salvo para a troca do <select> ser uma alteração de verdade.
      const { error } = await adminDb.client
        .from('store_settings')
        .update({ status_override: 'auto' })
        .eq('id', settings.id);
      expect(error).toBeNull();
      await page.goto('/admin/loja');
      const storeName = uniqueName('loja-digitada');
      const notice = uniqueName('aviso-digitado');
      await page.getByLabel('Nome da loja').fill(storeName);
      await page.getByLabel('Aviso curto').fill(notice);
      const mapsUrl = page.getByLabel('Link do mapa');
      await mapsUrl.fill('nao-e-um-link');
      const statusOverride = page.getByLabel('Funcionamento agora');
      await statusOverride.selectOption('closed');
      await page
        .getByRole('button', { name: 'Salvar dados da loja' })
        .filter({ visible: true })
        .click();

      await expect(mapsUrl).toHaveAttribute('aria-invalid', 'true');
      await expect(mapsUrl).toBeFocused();
      await expect(mapsUrl).toHaveValue('nao-e-um-link');
      await expect(page.getByLabel('Nome da loja')).toHaveValue(storeName);
      await expect(page.getByLabel('Aviso curto')).toHaveValue(notice);
      await expect(statusOverride).toHaveValue('closed');
    });
  });

  test('erro de validação no destaque novo mantém descrição e visibilidade', async ({
    page,
    uniqueName,
  }) => {
    await page.goto('/admin/destaques');
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    const description = uniqueName('destaque-sem-titulo');
    await page.getByLabel('Descrição').fill(description);
    const visible = page.getByRole('switch', { name: 'Destaque visível' });
    await visible.uncheck();
    await page.getByRole('button', { name: 'Criar destaque' }).click();

    const title = page.getByLabel('Título');
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toBeFocused();
    await expect(page.getByLabel('Descrição')).toHaveValue(description);
    await expect(visible).not.toBeChecked();
  });
});

import { expect, test, type Page } from '@playwright/test';

// O painel só é testado contra o banco LOCAL, onde `supabase/tests/fixtures/admin_local.sql`
// cria o administrador. Sem as duas variáveis, o arquivo inteiro é pulado.
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

const productName = `Teste E2E ${Date.now()}`;
let productId = '';

async function signIn(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('E-mail').fill(email ?? '');
  await page.getByLabel('Senha', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Resumo' })).toBeVisible();
}

async function coxinhasOnMenu(page: Page) {
  await page.goto('/cardapio');
  return page.locator('section#coxinhas [role="listitem"] h3').allTextContents();
}

test.describe('painel administrativo', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!email || !password, 'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD (banco local).');

  test('senha errada não entra', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('E-mail').fill(email ?? '');
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada-de-proposito');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();

    await expect(
      page.getByText('Não foi possível entrar com essas credenciais. Tente novamente.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('cria um produto e ele aparece no cardápio', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/produtos/novo');

    // A prévia do cartão repete o nome no rótulo do link; por isso o campo é buscado pelo papel.
    await page.getByRole('textbox', { name: 'Nome do produto' }).fill(productName);
    await page.getByRole('textbox', { name: 'Preço' }).fill('12,34');
    await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
    await page.getByRole('button', { name: 'Criar produto' }).click();

    await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}\?criado=1$/);
    productId = new URL(page.url()).pathname.split('/').pop() ?? '';

    await page.goto(`/produto/${productId}`);
    await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
    await expect(page.getByText('R$ 12,34')).toBeVisible();
    expect(await coxinhasOnMenu(page)).toContain(productName);
  });

  test('reordenar no painel muda a ordem no cardápio', async ({ page }) => {
    const before = await coxinhasOnMenu(page);
    const index = before.indexOf(productName);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(before.length).toBeGreaterThan(1);

    const moveUp = index > 0;
    const neighbor = moveUp ? index - 1 : index + 1;
    const expected = [...before];
    [expected[index], expected[neighbor]] = [expected[neighbor], expected[index]];

    await signIn(page);
    await page.goto('/admin/produtos');
    await page
      .getByRole('button', { name: `${moveUp ? 'Subir' : 'Descer'} ${productName}` })
      .locator('visible=true')
      .click();
    await expect(page.getByText('Ordem do produto atualizada.')).toBeVisible();

    expect(await coxinhasOnMenu(page)).toEqual(expected);
  });

  test('marcar "Em falta hoje" mostra o produto como indisponível', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/produtos');
    await page
      .getByLabel(`Situação de ${productName}`)
      .locator('visible=true')
      .selectOption('unavailable');
    await expect(page.getByText('Situação do produto atualizada.')).toBeVisible();

    await page.goto(`/produto/${productId}`);
    await expect(page.getByText('INDISPONÍVEL', { exact: true })).toBeVisible();
    await expect(page.getByText(/Indisponível no momento/)).toBeVisible();
  });

  test('sair encerra a sessão', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /^Sair/ }).locator('visible=true').first().click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.goto('/admin/produtos');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

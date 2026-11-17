import { expect, test, type AdminDb, type Page } from '../fixtures';

const CARD_PRICE_CENTS = 700;

async function createCategory(adminDb: AdminDb, name: string, isActive = true) {
  const { data, error } = await adminDb.client
    .from('categories')
    .insert({ name, slug: name.toLowerCase(), is_active: isActive, sort_order: 9000 })
    .select('id')
    .single();
  expect(error).toBeNull();
  adminDb.track('categories', data!.id);
  return data!.id;
}

async function createProduct(adminDb: AdminDb, name: string, categoryId: string) {
  const { data, error } = await adminDb.client
    .from('products')
    .insert({
      name,
      slug: name.toLowerCase(),
      category_id: categoryId,
      price_cents: CARD_PRICE_CENTS,
    })
    .select('id')
    .single();
  expect(error).toBeNull();
  adminDb.track('products', data!.id);
  return data!.id;
}

function panelLink(page: Page, name: string) {
  return page.getByRole('link', { name, exact: true }).filter({ visible: true }).first();
}

async function answerNextDialog(page: Page, accept: boolean) {
  const seen: string[] = [];
  page.once('dialog', async (dialog) => {
    seen.push(dialog.message());
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
  return seen;
}

test.describe('alterações não salvas', () => {
  test('o menu do painel pergunta antes de descartar o produto editado', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryId = await createCategory(adminDb, uniqueName('saida-categoria'));
    const productId = await createProduct(adminDb, uniqueName('saida-produto'), categoryId);
    const editUrl = `/admin/produtos/${productId}`;
    await page.goto(editUrl);
    const name = page.getByLabel('Nome do produto');
    await name.fill('Nome que não foi salvo');

    const refused = await answerNextDialog(page, false);
    await panelLink(page, 'Categorias').click();
    await expect.poll(() => refused).toEqual(['Sair sem salvar as alterações?']);
    await expect(page).toHaveURL(new RegExp(`${editUrl}$`));
    await expect(name).toHaveValue('Nome que não foi salvo');

    const accepted = await answerNextDialog(page, true);
    await panelLink(page, 'Categorias').click();
    await expect.poll(() => accepted).toHaveLength(1);
    await expect(page).toHaveURL(/\/admin\/categorias$/);
  });

  test('voltar pelo navegador também pergunta antes de descartar', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryId = await createCategory(adminDb, uniqueName('voltar-categoria'));
    const name = uniqueName('voltar-produto');
    const productId = await createProduct(adminDb, name, categoryId);
    const editUrl = `/admin/produtos/${productId}`;
    // Entra pela lista, como a pessoa faz: o voltar é uma navegação dentro do próprio painel.
    await page.goto('/admin/produtos');
    await panelLink(page, name).click();
    await expect(page).toHaveURL(new RegExp(`${editUrl}$`));
    const field = page.getByLabel('Nome do produto');
    await field.fill('Nome que não foi salvo');

    const refused = await answerNextDialog(page, false);
    await page.evaluate(() => history.back());
    await expect.poll(() => refused).toEqual(['Sair sem salvar as alterações?']);
    await expect(page).toHaveURL(new RegExp(`${editUrl}$`));
    await expect(field).toHaveValue('Nome que não foi salvo');

    const accepted = await answerNextDialog(page, true);
    await page.evaluate(() => history.back());
    await expect.poll(() => accepted).toHaveLength(1);
    await expect(page).toHaveURL(/\/admin\/produtos$/);
  });

  test('sem alteração, o menu troca de tela sem perguntar', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryId = await createCategory(adminDb, uniqueName('livre-categoria'));
    const productId = await createProduct(adminDb, uniqueName('livre-produto'), categoryId);
    await page.goto(`/admin/produtos/${productId}`);
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await panelLink(page, 'Categorias').click();
    await expect(page).toHaveURL(/\/admin\/categorias$/);
    expect(dialogs).toEqual([]);
  });

  test(
    'a Loja também pergunta, e mostra qual quadro significa dia fechado',
    { tag: '@leitura' },
    async ({ page }) => {
      await page.goto('/admin/loja');
      // Pelo `main`: durante o streaming o React mantém uma cópia escondida do conteúdo.
      await expect(page.getByRole('main').getByText('Dia fechado?')).toBeVisible();
      await page.getByLabel('Frase curta').fill('Frase que não foi salva');

      const refused = await answerNextDialog(page, false);
      await panelLink(page, 'Categorias').click();
      await expect.poll(() => refused).toHaveLength(1);
      await expect(page).toHaveURL(/\/admin\/loja$/);
    },
  );
});

test.describe('categoria escondida', () => {
  test('o Resumo e a lista de produtos deixam claro o que está fora do cardápio', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryName = uniqueName('resumo-fora');
    const categoryId = await createCategory(adminDb, categoryName, false);
    const productName = uniqueName('resumo-produto');
    await createProduct(adminDb, productName, categoryId);

    await page.goto('/admin');
    const row = page
      .locator('a[href="/admin/categorias"]')
      .filter({ hasText: categoryName })
      .filter({ visible: true });
    await expect(row).toContainText('CATEGORIA ESCONDIDA');
    await expect(row).toContainText('1 produto fora do cardápio');

    await page.goto(`/admin/produtos?categoria=${categoryId}`);
    await expect(
      page.getByRole('link', { name: productName }).filter({ visible: true }).first(),
    ).toBeVisible();
    // O nome da categoria não contém "escondida": só a marcação faz este texto aparecer.
    await expect(
      page
        .getByText(/\(escondida\)|^escondida$/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });
});

test.describe('listas do painel', () => {
  test('o aviso de erro de um botão some quando outra ação da lista começa', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const firstName = uniqueName('aviso-a');
    const secondName = uniqueName('aviso-b');
    const firstId = await createCategory(adminDb, firstName);
    await createCategory(adminDb, secondName);
    await page.goto('/admin/categorias');

    // Outra sessão muda a ordem: a tela ainda mostra este item como penúltimo, mas ele já é o último.
    const { error } = await adminDb.client
      .from('categories')
      .update({ sort_order: 9999 })
      .eq('id', firstId);
    expect(error).toBeNull();

    await page.getByRole('button', { name: `Descer ${firstName}` }).click();
    const notice = page
      .locator('p[role="alert"]')
      .filter({ hasText: 'Esta categoria já está no limite da lista.' });
    await expect(notice).toBeVisible();

    await page.getByRole('button', { name: `Subir ${secondName}` }).click();
    await expect(notice).toBeHidden();
  });

  test('em Produtos, as setas param no limite da categoria e o aviso fica à vista', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const categoryId = await createCategory(adminDb, uniqueName('aviso-produtos'));
    const names = [
      uniqueName('aviso-produto-a'),
      uniqueName('aviso-produto-b'),
      uniqueName('aviso-produto-c'),
    ];
    const ids: string[] = [];
    for (const [sortOrder, name] of names.entries()) {
      const id = await createProduct(adminDb, name, categoryId);
      const { error } = await adminDb.client
        .from('products')
        .update({ sort_order: sortOrder })
        .eq('id', id);
      expect(error).toBeNull();
      ids.push(id);
    }
    const [firstName, secondName, lastName] = names;
    const moveButton = (label: string) =>
      page.getByRole('button', { name: label }).filter({ visible: true });
    await page.goto(`/admin/produtos?categoria=${categoryId}`);
    await expect(moveButton(`Subir ${firstName}`)).toBeDisabled();
    await expect(moveButton(`Descer ${lastName}`)).toBeDisabled();
    await expect(moveButton(`Subir ${secondName}`)).toBeEnabled();

    // Com foto, o primeiro some do filtro "Sem foto". A API troca com o vizinho da categoria
    // inteira, que não estaria à vista: com filtro, as setas somem e a tela explica o motivo.
    const { error: imageError } = await adminDb.client
      .from('products')
      .update({ image_path: `e2e/${ids[0]}` })
      .eq('id', ids[0]);
    expect(imageError).toBeNull();
    await page.goto(`/admin/produtos?categoria=${categoryId}&filtro=sem-foto`);
    await expect(panelLink(page, secondName)).toBeVisible();
    await expect(page.getByRole('link', { name: firstName, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Subir ${secondName}` })).toHaveCount(0);
    await expect(
      page.getByText('Para mudar a ordem, limpe a busca e os filtros.').filter({ visible: true }),
    ).toBeVisible();
    await page.goto(`/admin/produtos?categoria=${categoryId}`);
    await expect(moveButton(`Subir ${secondName}`)).toBeEnabled();

    // Outra aba põe o segundo no topo: a tela ainda não sabe, e a API recusa a subida.
    const { error } = await adminDb.client
      .from('products')
      .update({ sort_order: -1 })
      .eq('id', ids[1]);
    expect(error).toBeNull();
    await moveButton(`Subir ${secondName}`).click();
    const notice = page
      .getByText('Este produto já está no limite da categoria.')
      .filter({ visible: true })
      .first();
    await expect(notice).toBeInViewport();

    await moveButton(`Descer ${secondName}`).click();
    await expect(notice).toBeHidden();
    await expect(page.getByText('Ordem do produto atualizada.')).toBeVisible();
  });

  test(
    'filtrar produtos não apaga a busca nem recarrega a tela',
    { tag: '@leitura' },
    async ({ page }) => {
      await page.goto('/admin/produtos');
      // O celular e o desktop têm cada um o seu campo de busca; só um aparece por vez.
      const search = page.getByPlaceholder('Buscar por nome').filter({ visible: true });
      await search.fill('coxinha');
      const serverRequests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('filtro=')) serverRequests.push(request.url());
      });
      await page
        .getByRole('button', { name: 'Escondidos', exact: true })
        .filter({ visible: true })
        .click();
      await expect(page).toHaveURL(/filtro=escondidos/);
      await expect(search).toHaveValue('coxinha');
      expect(serverRequests).toEqual([]);
    },
  );

  test(
    'o menu ⋯ fecha com Esc e com toque fora, e só um fica aberto',
    { tag: '@leitura' },
    async ({ page }) => {
      await page.goto('/admin/produtos');
      const menus = page.getByLabel(/^Mais ações para /).filter({ visible: true });
      const openMenus = page.getByText('Organizar na categoria').filter({ visible: true });

      await menus.nth(0).click();
      await expect(openMenus).toHaveCount(1);
      // O último fica longe do primeiro: o menu aberto não cobre o "⋯" que vai ser tocado.
      await menus.last().click();
      await expect(openMenus).toHaveCount(1);

      await page.keyboard.press('Escape');
      await expect(openMenus).toHaveCount(0);
      await expect(menus.last()).toBeFocused();

      await menus.nth(0).click();
      await expect(openMenus).toHaveCount(1);
      await page.getByRole('heading', { level: 1, name: 'Produtos' }).click();
      await expect(openMenus).toHaveCount(0);
    },
  );

  test('busca sem resultado explica e limpa os filtros', { tag: '@leitura' }, async ({ page }) => {
    await page.goto('/admin/produtos?filtro=sem-foto');
    const search = page.getByPlaceholder('Buscar por nome').filter({ visible: true });
    await search.fill('nenhum produto tem este nome');
    await expect(page.getByText('Nenhum produto encontrado com estes filtros.')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(search).toHaveValue('');
    await expect(page).toHaveURL(/\/admin\/produtos$/);
    await expect(page.getByText('Nenhum produto encontrado com estes filtros.')).toHaveCount(0);
  });

  test('trocar de tela mostra que está carregando', { tag: '@leitura' }, async ({ page }) => {
    await page.goto('/admin');
    // Espera os pedidos antecipados: são eles que deixam a tela de carregamento pronta para o clique.
    await page.waitForLoadState('networkidle');
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/admin/categorias**', async (route) => {
      await held;
      await route.continue();
    });
    await panelLink(page, 'Categorias').click();
    await expect(page.getByRole('status').filter({ hasText: 'Carregando…' })).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: 'Categorias', exact: true })).toBeVisible();
  });
});

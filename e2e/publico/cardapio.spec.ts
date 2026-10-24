import { expect, test, type APIRequestContext } from '../fixtures';

// Dados esperados: os de `supabase/seed.sql`.
const mainNav = 'Navegação principal';
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function productIdBySlug(request: APIRequestContext, slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('Configuração pública do Supabase ausente.');

  const endpoint = new URL('/rest/v1/products', supabaseUrl);
  endpoint.searchParams.set('select', 'id');
  endpoint.searchParams.set('slug', `eq.${slug}`);
  const response = await request.get(endpoint.toString(), {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!response.ok()) throw new Error(`Produto não encontrado pela API: ${response.status()}.`);
  const id = (await response.text()).match(UUID_PATTERN)?.[0];
  if (!id) throw new Error(`UUID ausente para o slug ${slug}.`);
  return id;
}

test.describe('cardápio público', () => {
  test(
    'a tela inicial lista categorias e produtos e marca a aba Início',
    { tag: '@responsive' },
    async ({ page }) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { level: 1, name: 'Cardápio da Salgaê' }),
      ).toBeAttached();
      await expect(
        page
          .getByRole('navigation', { name: 'Categorias' })
          .getByRole('link', { name: 'Coxinhas' }),
      ).toBeVisible();
      await expect(
        page.getByRole('list', { name: 'Produtos mais pedidos' }).getByRole('listitem'),
      ).not.toHaveCount(0);
      await expect(
        page.getByRole('navigation', { name: mainNav }).getByRole('link', { name: 'Início' }),
      ).toHaveAttribute('aria-current', 'page');
    },
  );

  test('do cardápio ao detalhe do produto e de volta', { tag: '@responsive' }, async ({ page }) => {
    await page.goto('/cardapio');

    const coxinhas = page.locator('section#coxinhas');
    await expect(coxinhas.getByRole('heading', { level: 2, name: 'Coxinhas' })).toBeVisible();
    await coxinhas.getByRole('link', { name: /^Coxinha de frango, R\$\s7,00/ }).click();

    await expect(page).toHaveURL(/\/produto\/coxinha-de-frango$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Coxinha de frango' })).toBeVisible();
    await expect(page.getByText('Disponível agora')).toBeVisible();
    await expect(page.getByText('Consulta apenas. Faça seu pedido com o atendente.')).toBeVisible();
    await expect(page).toHaveTitle('Coxinha de frango | Salgaê');
    // Prévia usada por WhatsApp e redes sociais.
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Frango cremoso em massa crocante.',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Coxinha de frango | Salgaê',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/produto\/coxinha-de-frango$/,
    );
    await expect(
      page.getByRole('navigation', { name: mainNav }).getByRole('link', { name: 'Cardápio' }),
    ).toHaveAttribute('aria-current', 'page');

    await page.goBack();
    await expect(page).toHaveURL(/\/cardapio$/);
  });

  test('link antigo por UUID redireciona para o slug', async ({ page, request }) => {
    const productId = await productIdBySlug(request, 'coxinha-de-frango');

    await page.goto(`/produto/${productId}`);

    await expect(page).toHaveURL(/\/produto\/coxinha-de-frango$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Coxinha de frango' })).toBeVisible();
  });

  test(
    'a busca encontra pelo nome, lembra o termo e avisa quando não acha',
    { tag: '@responsive' },
    async ({ page }) => {
      await page.goto('/busca');

      const search = page.getByRole('searchbox', { name: 'Buscar no cardápio' });
      await search.fill('pastel');
      await expect(page.getByText('1 resultado', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: /^Pastel de carne, / })).toBeVisible();
      await expect(page).toHaveURL(/\/busca\?q=pastel$/);

      await search.fill('xyzzy');
      await expect(page.getByRole('heading', { name: 'Nada por aqui' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver cardápio completo' })).toBeVisible();
    },
  );

  test('a aba Info abre as informações da loja', async ({ page }) => {
    await page.goto('/info');

    await expect(page.getByRole('heading', { level: 1, name: 'Informações' })).toBeAttached();
    await expect(
      page.getByRole('navigation', { name: mainNav }).getByRole('link', { name: 'Info' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('produto que não existe responde 404', async ({ page }) => {
    const missing = await page.goto('/produto/00000000-0000-4000-8000-000000000000');
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();

    const missingSlug = await page.goto('/produto/produto-que-nao-existe');
    expect(missingSlug?.status()).toBe(404);
  });

  test('o painel exige login e o site não é indexado fora da produção', async ({
    page,
    request,
  }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toMatch(/Disallow: \/\s*$/m);

    // Fora da produção, o sitemap não lista páginas.
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('<url>');
  });

  test('as páginas saem com os cabeçalhos de segurança', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
  });
});

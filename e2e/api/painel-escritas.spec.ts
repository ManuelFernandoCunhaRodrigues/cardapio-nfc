import { expect, test, type APIRequestContext } from '@playwright/test';

import { apiURL } from '../env';
import { adminAccessToken, customerAccessToken } from './auth-tokens';

const categoriesURL = `${apiURL}/v1/admin/categories`;
const highlightsURL = `${apiURL}/v1/admin/highlights`;
const storeURL = `${apiURL}/v1/admin/store`;
const absentId = '00000000-0000-4000-8000-000000000000';

type AdminCategory = { id: string; name: string; is_active: boolean; product_count: number };

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function uniqueSlug() {
  return `e2e-${crypto.randomUUID().slice(0, 8)}`;
}

function categoryInput(slug: string, overrides: Record<string, unknown> = {}) {
  return { name: `Teste ${slug}`, slug, description: '', is_active: false, ...overrides };
}

async function createCategory(request: APIRequestContext, token: string, slug = uniqueSlug()) {
  const response = await request.post(categoriesURL, {
    headers: bearer(token),
    data: categoryInput(slug),
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

async function listCategories(request: APIRequestContext, token: string) {
  const response = await request.get(categoriesURL, { headers: bearer(token) });
  return (await response.json()) as AdminCategory[];
}

test.describe('escritas do painel na API', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await adminAccessToken();
  });

  test('sem token as rotas do painel respondem 401', async ({ request }) => {
    const responses = await Promise.all([
      request.get(categoriesURL),
      request.post(highlightsURL, { data: {} }),
      request.put(`${storeURL}/status`, { data: { status_override: 'open' } }),
    ]);

    expect(responses.map((response) => response.status())).toEqual([401, 401, 401]);
  });

  test('usuário que não é admin não cria categoria', async ({ request }) => {
    const response = await request.post(categoriesURL, {
      headers: bearer(await customerAccessToken()),
      data: categoryInput(uniqueSlug()),
    });

    expect(response.status()).toBe(403);
  });

  test('a categoria criada aparece na lista do painel sem produtos', async ({ request }) => {
    const id = await createCategory(request, token);

    expect(await listCategories(request, token)).toContainEqual(
      expect.objectContaining({ id, is_active: false, product_count: 0 }),
    );
    await request.delete(`${categoriesURL}/${id}`, { headers: bearer(token) });
  });

  test('admin ativa uma categoria', async ({ request }) => {
    const id = await createCategory(request, token);

    const response = await request.put(`${categoriesURL}/${id}/active`, {
      headers: bearer(token),
      data: { is_active: true },
    });

    expect(response.status()).toBe(204);
    expect(await listCategories(request, token)).toContainEqual(
      expect.objectContaining({ id, is_active: true }),
    );
    await request.delete(`${categoriesURL}/${id}`, { headers: bearer(token) });
  });

  test('admin renomeia uma categoria', async ({ request }) => {
    const slug = uniqueSlug();
    const id = await createCategory(request, token, slug);

    const response = await request.put(`${categoriesURL}/${id}`, {
      headers: bearer(token),
      data: categoryInput(slug, { name: 'Teste renomeada' }),
    });

    expect(response.status()).toBe(204);
    expect(await listCategories(request, token)).toContainEqual(
      expect.objectContaining({ id, name: 'Teste renomeada' }),
    );
    await request.delete(`${categoriesURL}/${id}`, { headers: bearer(token) });
  });

  test('admin apaga uma categoria sem produtos', async ({ request }) => {
    const id = await createCategory(request, token);

    const response = await request.delete(`${categoriesURL}/${id}`, { headers: bearer(token) });

    expect(response.status()).toBe(204);
    expect((await listCategories(request, token)).map((category) => category.id)).not.toContain(id);
  });

  test('editar ou ativar categoria que não existe responde 404', async ({ request }) => {
    const [update, activation] = await Promise.all([
      request.put(`${categoriesURL}/${absentId}`, {
        headers: bearer(token),
        data: categoryInput(uniqueSlug()),
      }),
      request.put(`${categoriesURL}/${absentId}/active`, {
        headers: bearer(token),
        data: { is_active: true },
      }),
    ]);

    expect([update.status(), activation.status()]).toEqual([404, 404]);
  });

  test('endereço curto repetido responde 409 apontando o campo', async ({ request }) => {
    const slug = uniqueSlug();
    const id = await createCategory(request, token, slug);

    const duplicate = await request.post(categoriesURL, {
      headers: bearer(token),
      data: categoryInput(slug),
    });

    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      status: 'error',
      fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
    });
    await request.delete(`${categoriesURL}/${id}`, { headers: bearer(token) });
  });

  test('não apaga categoria que tem produtos', async ({ request }) => {
    const withProducts = (await listCategories(request, token)).find(
      (category) => category.product_count > 0,
    );
    expect(withProducts).toBeDefined();

    const response = await request.delete(`${categoriesURL}/${withProducts!.id}`, {
      headers: bearer(token),
    });

    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining('possui produtos vinculados'),
    });
  });

  test('admin cria um destaque e recebe o id', async ({ request }) => {
    const response = await request.post(highlightsURL, {
      headers: bearer(token),
      data: { title: 'Destaque do E2E', description: '', target: '/cardapio', is_active: false },
    });
    const { id } = (await response.json()) as { id: string };

    expect(response.status()).toBe(201);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    await request.delete(`${highlightsURL}/${id}`, { headers: bearer(token) });
  });

  test('apagar destaque que não existe responde 404', async ({ request }) => {
    const response = await request.delete(`${highlightsURL}/${absentId}`, {
      headers: bearer(token),
    });

    expect(response.status()).toBe(404);
  });

  test('dados da loja inválidos respondem 400 com erros por campo', async ({ request }) => {
    const current = await (await request.get(storeURL, { headers: bearer(token) })).json();

    const response = await request.put(storeURL, {
      headers: bearer(token),
      data: { ...current, maps_url: 'nao-e-url' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      fieldErrors: { maps_url: expect.arrayContaining(['Informe uma URL válida.']) },
    });
  });
});

import { expect, test, type APIRequestContext } from '@playwright/test';

import { apiURL } from '../env';
import { adminAccessToken, customerAccessToken } from './auth-tokens';

const categoriesURL = `${apiURL}/v1/admin/categories`;
const highlightsURL = `${apiURL}/v1/admin/highlights`;

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function createCategory(request: APIRequestContext, token: string, slug: string) {
  const response = await request.post(categoriesURL, {
    headers: bearer(token),
    data: { name: `Teste ${slug}`, slug, description: '', is_active: false },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

test.describe('escritas do painel na API', () => {
  test('sem token as rotas do painel respondem 401', async ({ request }) => {
    const responses = await Promise.all([
      request.get(categoriesURL),
      request.post(highlightsURL, { data: {} }),
      request.put(`${apiURL}/v1/admin/store/status`, { data: { status_override: 'open' } }),
    ]);

    expect(responses.map((response) => response.status())).toEqual([401, 401, 401]);
  });

  test('usuário que não é admin não cria categoria', async ({ request }) => {
    const response = await request.post(categoriesURL, {
      headers: bearer(await customerAccessToken()),
      data: { name: 'Invasora', slug: 'invasora', description: '', is_active: true },
    });

    expect(response.status()).toBe(403);
  });

  test('admin cria, liga, renomeia e apaga uma categoria', async ({ request }) => {
    const token = await adminAccessToken();
    const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`;
    const id = await createCategory(request, token, slug);

    const activation = await request.put(`${categoriesURL}/${id}/active`, {
      headers: bearer(token),
      data: { is_active: true },
    });
    const update = await request.put(`${categoriesURL}/${id}`, {
      headers: bearer(token),
      data: { name: 'Teste renomeada', slug, description: 'Criada pelo E2E', is_active: true },
    });
    const list = await request.get(categoriesURL, { headers: bearer(token) });
    const removal = await request.delete(`${categoriesURL}/${id}`, { headers: bearer(token) });

    expect([activation.status(), update.status(), removal.status()]).toEqual([204, 204, 204]);
    expect(await list.json()).toContainEqual(
      expect.objectContaining({ id, name: 'Teste renomeada', is_active: true, product_count: 0 }),
    );
  });

  test('endereço curto repetido responde 409 apontando o campo', async ({ request }) => {
    const token = await adminAccessToken();
    const slug = `e2e-${crypto.randomUUID().slice(0, 8)}`;
    const id = await createCategory(request, token, slug);

    const duplicate = await request.post(categoriesURL, {
      headers: bearer(token),
      data: { name: 'Repetida', slug, description: '', is_active: false },
    });
    await request.delete(`${categoriesURL}/${id}`, { headers: bearer(token) });

    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      status: 'error',
      fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
    });
  });

  test('não apaga categoria que tem produtos', async ({ request }) => {
    const token = await adminAccessToken();
    const categories = (await (
      await request.get(categoriesURL, { headers: bearer(token) })
    ).json()) as Array<{ id: string; product_count: number }>;
    const withProducts = categories.find((category) => category.product_count > 0);
    expect(withProducts).toBeDefined();

    const response = await request.delete(`${categoriesURL}/${withProducts!.id}`, {
      headers: bearer(token),
    });

    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining('possui produtos vinculados'),
    });
  });

  test('admin cria e apaga um destaque; o id apagado depois responde 404', async ({
    request,
  }) => {
    const token = await adminAccessToken();
    const created = await request.post(highlightsURL, {
      headers: bearer(token),
      data: { title: 'Destaque do E2E', description: '', target: '/cardapio', is_active: false },
    });
    const { id } = (await created.json()) as { id: string };

    const removal = await request.delete(`${highlightsURL}/${id}`, { headers: bearer(token) });
    const again = await request.delete(`${highlightsURL}/${id}`, { headers: bearer(token) });

    expect([created.status(), removal.status(), again.status()]).toEqual([201, 204, 404]);
  });

  test('dados da loja inválidos respondem 400 com erros por campo', async ({ request }) => {
    const token = await adminAccessToken();
    const current = await (
      await request.get(`${apiURL}/v1/admin/store`, { headers: bearer(token) })
    ).json();

    const response = await request.put(`${apiURL}/v1/admin/store`, {
      headers: bearer(token),
      data: { ...current, maps_url: 'nao-e-url' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      fieldErrors: { maps_url: [expect.any(String)] },
    });
  });
});

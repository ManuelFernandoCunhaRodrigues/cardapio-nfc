import { expect, test, type APIRequestContext } from '@playwright/test';

import { apiURL } from '../env';
import { adminAccessToken } from './auth-tokens';

const productsURL = `${apiURL}/v1/admin/products`;
const categoriesURL = `${apiURL}/v1/admin/categories`;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const uniqueSlug = () => `e2e-product-${crypto.randomUUID().slice(0, 8)}`;

async function createCategory(request: APIRequestContext, token: string) {
  const slug = `e2e-category-${crypto.randomUUID().slice(0, 8)}`;
  const response = await request.post(categoriesURL, {
    headers: bearer(token),
    data: { name: `Category ${slug}`, slug, description: '', is_active: false },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

function productInput(categoryId: string, slug?: string) {
  return {
    name: `Product ${crypto.randomUUID().slice(0, 8)}`,
    description: '',
    price: 'R$ 8,90',
    category_id: categoryId,
    badge: null,
    is_active: false,
    is_available: true,
    ...(slug ? { slug } : {}),
  };
}

async function createProduct(
  request: APIRequestContext,
  token: string,
  categoryId: string,
  slug?: string,
) {
  const response = await request.post(productsURL, {
    headers: bearer(token),
    data: productInput(categoryId, slug),
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

test.describe('produtos do painel na API', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await adminAccessToken();
  });

  test('sem token responde 401', async ({ request }) => {
    expect((await request.get(productsURL)).status()).toBe(401);
  });

  test('admin cria, lista, edita situação e apaga produto', async ({ request }) => {
    const categoryId = await createCategory(request, token);
    const id = await createProduct(request, token, categoryId);
    try {
      const listed = (await (
        await request.get(productsURL, { headers: bearer(token) })
      ).json()) as Array<{ id: string; category: { name: string; slug: string } }>;
      expect(listed).toContainEqual(
        expect.objectContaining({
          id,
          category: expect.objectContaining({ slug: expect.any(String) }),
        }),
      );

      const update = await request.put(`${productsURL}/${id}`, {
        headers: bearer(token),
        data: { ...productInput(categoryId), name: 'Product edited' },
      });
      const situation = await request.put(`${productsURL}/${id}/situation`, {
        headers: bearer(token),
        data: { situation: 'unavailable' },
      });
      expect([update.status(), situation.status()]).toEqual([204, 204]);

      expect(
        (await request.delete(`${productsURL}/${id}`, { headers: bearer(token) })).status(),
      ).toBe(204);
    } finally {
      await request.delete(`${productsURL}/${id}`, { headers: bearer(token) });
      await request.delete(`${categoriesURL}/${categoryId}`, { headers: bearer(token) });
    }
  });

  test('slug repetido responde 409 apontando o campo', async ({ request }) => {
    const categoryId = await createCategory(request, token);
    const slug = uniqueSlug();
    const id = await createProduct(request, token, categoryId, slug);
    try {
      const duplicate = await request.post(productsURL, {
        headers: bearer(token),
        data: productInput(categoryId, slug),
      });
      expect(duplicate.status()).toBe(409);
      expect(await duplicate.json()).toMatchObject({
        fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
      });
    } finally {
      await request.delete(`${productsURL}/${id}`, { headers: bearer(token) });
      await request.delete(`${categoriesURL}/${categoryId}`, { headers: bearer(token) });
    }
  });

  test('foto acima do limite responde 413', async ({ request }) => {
    const categoryId = await createCategory(request, token);
    const id = await createProduct(request, token, categoryId);
    try {
      const response = await request.post(`${productsURL}/${id}/image`, {
        headers: bearer(token),
        multipart: {
          image: {
            name: 'large.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.alloc(4 * 1024 * 1024),
          },
        },
      });
      expect(response.status()).toBe(413);
      expect(await response.json()).toMatchObject({ message: expect.stringContaining('4 MB') });
    } finally {
      await request.delete(`${productsURL}/${id}`, { headers: bearer(token) });
      await request.delete(`${categoriesURL}/${categoryId}`, { headers: bearer(token) });
    }
  });
});

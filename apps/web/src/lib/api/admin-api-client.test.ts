import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createAdminApiClient } from './admin-api-client';
import { ApiRequestError } from './api-request-error';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function client(response: Response, token: string | null = 'admin-token') {
  const fetchImplementation = vi.fn(async () => response);
  const api = createAdminApiClient({
    getToken: async () => token,
    fetchImplementation,
  });
  return { api, fetchImplementation };
}

describe('createAdminApiClient', () => {
  it('manda o token do admin e não usa cache', async () => {
    const { api, fetchImplementation } = client(jsonResponse({ ok: true }));

    await api.read('/v1/admin/store', z.object({ ok: z.boolean() }));

    expect(fetchImplementation).toHaveBeenCalledWith(
      '/v1/admin/store',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: 'Bearer admin-token' },
      }),
    );
  });

  it('envia o corpo em JSON e devolve o id criado', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const { api, fetchImplementation } = client(jsonResponse({ id }, 201));

    await expect(api.create('/v1/admin/categories', { name: 'Coxinhas' })).resolves.toBe(id);
    expect(fetchImplementation).toHaveBeenCalledWith(
      '/v1/admin/categories',
      expect.objectContaining({ body: JSON.stringify({ name: 'Coxinhas' }) }),
    );
  });

  it('preserva FormData e deixa o navegador definir o Content-Type', async () => {
    const { api, fetchImplementation } = client(jsonResponse({ path: 'products/image.webp' }));
    const body = new FormData();
    body.set('file', new Blob(['image'], { type: 'image/webp' }), 'image.webp');

    await api.upload('/v1/admin/products/image', body);

    expect(fetchImplementation).toHaveBeenCalledWith(
      '/v1/admin/products/image',
      expect.objectContaining({
        body,
        headers: { Authorization: 'Bearer admin-token' },
      }),
    );
  });

  it('sem sessão recusa antes de chamar a API', async () => {
    const { api, fetchImplementation } = client(jsonResponse({}), null);

    await expect(api.write('DELETE', '/v1/admin/categories/x')).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('traz a mensagem e os erros por campo da API', async () => {
    const { api } = client(
      jsonResponse(
        { status: 'error', message: 'Revise os campos.', fieldErrors: { slug: ['Repetido.'] } },
        409,
      ),
    );

    const error = await api.write('PUT', '/v1/admin/categories/x', {}).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      status: 409,
      message: 'Revise os campos.',
      fieldErrors: { slug: ['Repetido.'] },
      isExpected: true,
    });
  });

  it('trata resposta de erro fora do contrato como inesperada', async () => {
    const { api } = client(new Response('Bad gateway', { status: 502 }));

    await expect(api.write('POST', '/v1/admin/highlights', {})).rejects.toMatchObject({
      status: 502,
      isExpected: false,
    });
  });
});

import { expect, test } from '@playwright/test';

import { apiURL, requiredEnv } from '../env';
import { adminAccessToken, customerAccessToken } from './auth-tokens';

const sessionURL = `${apiURL}/v1/admin/session`;

test.describe('sessão do painel na API', () => {
  test('sem token responde 401', async ({ request }) => {
    const response = await request.get(sessionURL);

    expect(response.status()).toBe(401);
    expect(response.headers()['x-request-id']).toBeTruthy();
  });

  test('usuário que não é admin responde 403', async ({ request }) => {
    const token = await customerAccessToken();

    const response = await request.get(sessionURL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status()).toBe(403);
  });

  test('admin ativo responde 200 com o próprio e-mail', async ({ request }) => {
    const token = await adminAccessToken();

    const response = await request.get(sessionURL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      email: requiredEnv('E2E_ADMIN_EMAIL'),
      role: 'admin',
    });
  });

  test('devolve o request-id recebido', async ({ request }) => {
    const requestId = crypto.randomUUID();

    const response = await request.get(`${apiURL}/health`, {
      headers: { 'x-request-id': requestId },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['x-request-id']).toBe(requestId);
  });
});

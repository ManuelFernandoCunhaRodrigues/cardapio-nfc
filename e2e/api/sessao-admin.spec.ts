import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { apiURL, requiredEnv } from '../env';

const sessionURL = `${apiURL}/v1/admin/session`;

function supabaseClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function adminAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient().auth.signInWithPassword({
    email: requiredEnv('E2E_ADMIN_EMAIL'),
    password: requiredEnv('E2E_ADMIN_PASSWORD'),
  });
  if (error || !data.session) throw new Error(`Login do admin falhou: ${error?.message}`);
  return data.session.access_token;
}

async function customerAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient().auth.signUp({
    email: `cliente-${crypto.randomUUID()}@salgae.test`,
    password: crypto.randomUUID(),
  });
  if (error || !data.session) throw new Error(`Cadastro do cliente falhou: ${error?.message}`);
  return data.session.access_token;
}

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

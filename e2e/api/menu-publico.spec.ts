import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import type { Database } from '@salgae/core/database/database.types';
import { apiURL, requiredEnv } from '../env';

const inactiveProductName = 'Produto inativo do E2E';
const inactiveCategoryName = 'Categoria inativa do E2E';
const inactiveHighlightTitle = 'Destaque inativo do E2E';
let adminClient: SupabaseClient<Database>;
let inactiveProductId: string;
let inactiveProductSlug: string;
let inactiveCategoryId: string;
let inactiveHighlightId: string;
let seedProduct: { id: string; slug: string };

test.beforeAll(async () => {
  adminClient = createClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: signInError } = await adminClient.auth.signInWithPassword({
    email: requiredEnv('E2E_ADMIN_EMAIL'),
    password: requiredEnv('E2E_ADMIN_PASSWORD'),
  });
  if (signInError) throw signInError;

  const { data: seeded, error: seedError } = await adminClient
    .from('products')
    .select('id, slug, category_id')
    .eq('name', 'Coxinha de frango')
    .single();
  if (seedError) throw seedError;
  seedProduct = { id: seeded.id, slug: seeded.slug };

  const { data: inactive, error: insertError } = await adminClient
    .from('products')
    .insert({
      category_id: seeded.category_id,
      name: inactiveProductName,
      price_cents: 100,
      is_active: false,
    })
    .select('id, slug')
    .single();
  if (insertError) throw insertError;
  inactiveProductId = inactive.id;
  inactiveProductSlug = inactive.slug;

  const [categoryResult, highlightResult] = await Promise.all([
    adminClient
      .from('categories')
      .insert({ name: inactiveCategoryName, slug: 'categoria-inativa-e2e', is_active: false })
      .select('id')
      .single(),
    adminClient
      .from('highlights')
      .insert({ title: inactiveHighlightTitle, is_active: false })
      .select('id')
      .single(),
  ]);
  if (categoryResult.error) throw categoryResult.error;
  if (highlightResult.error) throw highlightResult.error;
  inactiveCategoryId = categoryResult.data.id;
  inactiveHighlightId = highlightResult.data.id;
});

test.afterAll(async () => {
  if (inactiveProductId) await adminClient.from('products').delete().eq('id', inactiveProductId);
  if (inactiveHighlightId)
    await adminClient.from('highlights').delete().eq('id', inactiveHighlightId);
  if (inactiveCategoryId)
    await adminClient.from('categories').delete().eq('id', inactiveCategoryId);
});

test('GET /v1/menu returns seed content and only active items', async ({ request }) => {
  const response = await request.get(`${apiURL}/v1/menu`);
  const menu = (await response.json()) as {
    categories: Array<{ name: string }>;
    products: Array<{ name: string }>;
    highlights: Array<{ title: string }>;
  };

  expect(response.status()).toBe(200);
  expect(menu.products).toContainEqual(expect.objectContaining({ name: 'Coxinha de frango' }));
  expect(menu.products).not.toContainEqual(expect.objectContaining({ name: inactiveProductName }));
  expect(menu.categories).not.toContainEqual(
    expect.objectContaining({ name: inactiveCategoryName }),
  );
  expect(menu.highlights).not.toContainEqual(
    expect.objectContaining({ title: inactiveHighlightTitle }),
  );
});

test('GET /v1/menu/products/:slug returns a seed product', async ({ request }) => {
  const response = await request.get(`${apiURL}/v1/menu/products/${seedProduct.slug}`);

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    product: { id: seedProduct.id, slug: seedProduct.slug },
  });
});

test('an absent product returns the error envelope and request id', async ({ request }) => {
  const response = await request.get(`${apiURL}/v1/menu/products/produto-ausente`);

  expect(response.status()).toBe(404);
  expect(response.headers()['x-request-id']).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ status: 'error' });
});

test('a legacy id returns the product', async ({ request }) => {
  const response = await request.get(`${apiURL}/v1/menu/products/${seedProduct.id}`);

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ product: { slug: seedProduct.slug } });
});

test('GET /v1/store returns public settings', async ({ request }) => {
  const response = await request.get(`${apiURL}/v1/store`);

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ id: true, name: expect.any(String) });
});

test('the sitemap excludes inactive products', async ({ request }) => {
  const response = await request.get(`${apiURL}/v1/menu/sitemap`);
  const items = (await response.json()) as Array<{ slug: string }>;

  expect(response.status()).toBe(200);
  expect(items).toContainEqual({ slug: seedProduct.slug, updated_at: expect.any(String) });
  expect(items).not.toContainEqual(expect.objectContaining({ slug: inactiveProductSlug }));
});

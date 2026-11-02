export const category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Coxinhas',
  slug: 'coxinhas',
  image_path: null,
  sort_order: 1,
};

export const product = {
  id: '22222222-2222-4222-8222-222222222222',
  category_id: category.id,
  name: 'Coxinha de frango',
  slug: 'coxinha-de-frango',
  description: 'Frango cremoso.',
  price_cents: 700,
  image_path: null,
  video_path: null,
  badge: null,
  sort_order: 1,
  is_active: true,
  is_available: true,
};

export const highlight = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Mais pedido',
  description: null,
  image_path: null,
  target: '/produto/coxinha-de-frango',
  sort_order: 1,
};

export const sitemapItem = {
  slug: product.slug,
  updated_at: '2026-10-30T12:00:00.000Z',
};

import { describe, expect, test } from 'vitest';

import { getProductMetadata } from './product-metadata';

const product = {
  id: '6ac417ce-e9b5-496d-b5bf-2d07cd2d8197',
  category_id: 'f8ec9a0b-a79f-47fe-b2d2-ebf81c72d2a3',
  name: 'Coxinha de frango',
  slug: 'coxinha-de-frango',
  description: null,
  price_cents: 700,
  image_path: null,
  video_path: null,
  badge: null,
  sort_order: 0,
  is_active: true,
  is_available: true,
};

describe('getProductMetadata', () => {
  test('usa os metadados padrão para produto ausente', () => {
    expect(getProductMetadata(null, null, 'Salgaê')).toEqual({ title: 'Produto | Salgaê' });
  });

  test('monta título, descrição de fallback e canonical; sem foto, usa a imagem padrão', () => {
    const metadata = getProductMetadata(product, null, 'Salgaê');

    expect(metadata.title).toBe('Coxinha de frango | Salgaê');
    expect(metadata.description).toMatch(/^Conheça Coxinha de frango por R\$\s7,00 na Salgaê\.$/);
    expect(metadata.alternates).toEqual({ canonical: `/produto/${product.slug}` });
    expect(metadata.openGraph).toMatchObject({
      url: `/produto/${product.slug}`,
      locale: 'pt_BR',
      siteName: 'Salgaê',
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['/brand/compartilhar.jpg'],
    });
  });

  test('inclui a variante detail na imagem social', () => {
    const metadata = getProductMetadata(
      { ...product, description: 'Massa crocante.', image_path: 'coxinha' },
      'https://example.supabase.co/storage/v1/object/public/product-images/coxinha-detail.webp',
      'Salgaê',
    );

    expect(metadata.description).toBe('Massa crocante.');
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: expect.stringMatching(/coxinha-detail\.webp$/) }],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [expect.stringMatching(/coxinha-detail\.webp$/)],
    });
  });

  test('usa o nome da loja cadastrado no painel', () => {
    const metadata = getProductMetadata(product, null, 'Lanchonete do Zé');

    expect(metadata.title).toBe('Coxinha de frango | Lanchonete do Zé');
    expect(metadata.description).toMatch(/na Lanchonete do Zé\.$/);
    expect(metadata.openGraph).toMatchObject({ siteName: 'Lanchonete do Zé' });
  });
});

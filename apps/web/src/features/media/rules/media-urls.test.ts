import { describe, expect, it } from 'vitest';

import { getImageVariantPath, getPublicMediaUrl } from '@/features/media/rules/media-urls';

describe('getImageVariantPath', () => {
  it('monta o caminho da variante para um caminho-base', () => {
    expect(getImageVariantPath('products/id/base', 'card')).toBe('products/id/base-card.webp');
  });

  it('preserva o caminho de uma imagem legada', () => {
    expect(getImageVariantPath('products/id/legacy.jpg', 'detail')).toBe('products/id/legacy.jpg');
  });
});

describe('getPublicMediaUrl', () => {
  it('monta a URL pública e codifica cada segmento do caminho', () => {
    expect(
      getPublicMediaUrl(
        'product-images',
        'produtos/coxinha quente.webp',
        'https://abc.supabase.co',
      ),
    ).toBe(
      'https://abc.supabase.co/storage/v1/object/public/product-images/produtos/coxinha%20quente.webp',
    );
  });

  it('não retorna URL para mídia ou projeto ausente', () => {
    expect(getPublicMediaUrl('product-images', null, 'https://abc.supabase.co')).toBeNull();
    expect(getPublicMediaUrl('product-images', 'foto.webp', '')).toBeNull();
  });
});

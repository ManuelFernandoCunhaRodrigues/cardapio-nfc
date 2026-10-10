import { describe, expect, it } from 'vitest';

import { getPublicMediaUrl } from '@/lib/media';

describe('getPublicMediaUrl', () => {
  it('monta a URL pública e codifica cada segmento do caminho', () => {
    expect(getPublicMediaUrl('product-images', 'produtos/coxinha quente.webp', 'https://abc.supabase.co'))
      .toBe('https://abc.supabase.co/storage/v1/object/public/product-images/produtos/coxinha%20quente.webp');
  });

  it('não retorna URL para mídia ou projeto ausente', () => {
    expect(getPublicMediaUrl('product-images', null, 'https://abc.supabase.co')).toBeNull();
    expect(getPublicMediaUrl('product-images', 'foto.webp', '')).toBeNull();
  });
});

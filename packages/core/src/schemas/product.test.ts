import { describe, expect, it } from 'vitest';

import { productFormSchema, productSchema } from './product';

const product = {
  id: 'b76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
  category_id: '7a1af5ec-0800-4201-9df3-e58f4d8a2bd4',
  name: 'Coxinha de frango',
  slug: 'coxinha-de-frango',
  description: null,
  price_cents: 700,
  image_path: null,
  sort_order: 0,
  is_active: true,
  is_available: true,
};

describe('productSchema', () => {
  it('aceita vídeo nulo ou ausente', () => {
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(productSchema.safeParse({ ...product, video_path: null }).success).toBe(true);
  });

  it('exige imagem de capa quando há vídeo', () => {
    expect(
      productSchema.safeParse({ ...product, video_path: 'products/coxinha.mp4' }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({
        ...product,
        image_path: 'products/coxinha.jpg',
        video_path: 'products/coxinha.mp4',
      }).success,
    ).toBe(true);
  });

  it('aceita somente os badges previstos', () => {
    expect(productSchema.safeParse({ ...product, badge: 'mais_pedido' }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, badge: 'novo' }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, badge: 'promo' }).success).toBe(false);
  });

  it('aceita somente slugs no formato de URL', () => {
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(productSchema.safeParse({ ...product, slug: 'Coxinha de frango' }).success).toBe(false);
  });

  it('valida os campos editáveis do formulário', () => {
    expect(
      productFormSchema.safeParse({
        name: 'Coxinha',
        description: '',
        price: '8,90',
        category_id: product.category_id,
        badge: 'novo',
        is_active: true,
        is_available: true,
      }).success,
    ).toBe(true);
    expect(
      productFormSchema.safeParse({
        name: '',
        description: '',
        price: '',
        category_id: 'inválido',
        badge: 'promo',
        is_active: true,
        is_available: true,
      }).success,
    ).toBe(false);
  });
});

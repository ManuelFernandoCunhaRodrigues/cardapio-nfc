import { describe, expect, it } from 'vitest';

import { publicApiPaths, publicMenuResponseSchema } from './public-api';

describe('public API contract', () => {
  it('builds a safely encoded product path', () => {
    expect(publicApiPaths.product('coxinha especial')).toBe('/v1/menu/products/coxinha%20especial');
  });

  it('rejects a menu product outside the product contract', () => {
    const parsed = publicMenuResponseSchema.safeParse({
      categories: [],
      highlights: [],
      products: [{ id: 'invalid' }],
    });

    expect(parsed.success).toBe(false);
  });
});

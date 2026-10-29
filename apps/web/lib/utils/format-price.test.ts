import { describe, expect, it } from 'vitest';

import { formatPriceBRL } from '@/lib/utils/format-price';

describe('formatPriceBRL', () => {
  it('formata centavos em real brasileiro', () => {
    expect(formatPriceBRL(1250)).toBe('R$ 12,50');
  });

  it('rejeita valores fracionários ou negativos', () => {
    expect(() => formatPriceBRL(-1)).toThrow();
    expect(() => formatPriceBRL(12.5)).toThrow();
  });
});

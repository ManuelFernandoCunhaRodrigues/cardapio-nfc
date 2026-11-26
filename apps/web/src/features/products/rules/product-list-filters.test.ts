import { describe, expect, it } from 'vitest';

import { productFilterFromParam } from './product-list-filters';

describe('productFilterFromParam', () => {
  it.each([
    ['em-falta', 'unavailable'],
    ['sem-foto', 'without-image'],
    ['escondidos', 'hidden'],
  ] as const)('lê o filtro %s', (param, filter) => {
    expect(productFilterFromParam(param)).toBe(filter);
  });

  it.each([
    ['indisponiveis', 'unavailable'],
    ['desativados', 'hidden'],
  ] as const)('aceita o nome antigo %s', (param, filter) => {
    expect(productFilterFromParam(param)).toBe(filter);
  });

  it.each([null, '', 'qualquer'])('mostra todos com %s', (param) => {
    expect(productFilterFromParam(param)).toBe('all');
  });
});

import { describe, expect, it } from 'vitest';

import { slugifyPtBr } from './slug';

describe('slugifyPtBr', () => {
  it('remove acentos, espaços e pontuação', () => {
    expect(slugifyPtBr('  Porções & Açaí!  ')).toBe('porcoes-acai');
  });
});

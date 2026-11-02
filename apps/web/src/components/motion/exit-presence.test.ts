import { describe, expect, it } from 'vitest';

import { layerAttributes } from './exit-presence';

describe('layerAttributes', () => {
  it('não muda nada na camada ativa', () => {
    expect(layerAttributes(true)).toEqual({});
  });

  it('deixa inerte e fora da árvore de acessibilidade a camada que sai ou fica coberta', () => {
    expect(layerAttributes(false)).toEqual({ inert: true, 'aria-hidden': true });
  });
});

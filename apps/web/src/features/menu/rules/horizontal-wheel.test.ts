import { describe, expect, it } from 'vitest';

import { getHorizontalWheelDelta } from './horizontal-wheel';

const mouseNotch = { deltaX: 0, deltaY: 100, deltaMode: 0, ctrlKey: false };
const middle = { scrollLeft: 200, scrollWidth: 1000, clientWidth: 400 };

describe('faixa lateral com a roda do mouse', () => {
  it('a roda para baixo anda para a direita, e para cima, para a esquerda', () => {
    expect(getHorizontalWheelDelta(mouseNotch, middle)).toBe(100);
    expect(getHorizontalWheelDelta({ ...mouseNotch, deltaY: -100 }, middle)).toBe(-100);
  });

  it('converte linhas (Firefox) e páginas em pixels', () => {
    expect(getHorizontalWheelDelta({ ...mouseNotch, deltaY: 3, deltaMode: 1 }, middle)).toBe(48);
    expect(getHorizontalWheelDelta({ ...mouseNotch, deltaY: 1, deltaMode: 2 }, middle)).toBe(400);
  });

  it('nas pontas devolve a rolagem para a página', () => {
    const atStart = { ...middle, scrollLeft: 0 };
    const atEnd = { ...middle, scrollLeft: 600 };
    expect(getHorizontalWheelDelta({ ...mouseNotch, deltaY: -100 }, atStart)).toBeNull();
    expect(getHorizontalWheelDelta(mouseNotch, atEnd)).toBeNull();
    expect(getHorizontalWheelDelta(mouseNotch, atStart)).toBe(100);
  });

  it('não mexe em faixa que cabe inteira na tela', () => {
    expect(
      getHorizontalWheelDelta(mouseNotch, { scrollLeft: 0, scrollWidth: 400, clientWidth: 400 }),
    ).toBeNull();
  });

  it('deixa zoom (Ctrl), rolagem lateral e touchpad com o navegador', () => {
    expect(getHorizontalWheelDelta({ ...mouseNotch, ctrlKey: true }, middle)).toBeNull();
    expect(getHorizontalWheelDelta({ ...mouseNotch, deltaX: 30 }, middle)).toBeNull();
    expect(getHorizontalWheelDelta({ ...mouseNotch, deltaY: 12 }, middle)).toBeNull();
  });
});

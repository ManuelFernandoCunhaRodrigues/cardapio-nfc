import { describe, expect, it, vi } from 'vitest';

import { createLayerStack } from './layer-stack';

describe('createLayerStack', () => {
  it('trata a camada aberta por último como a de cima', () => {
    const stack = createLayerStack();
    const sheet = Symbol('sheet');
    const confirmation = Symbol('confirmation');

    stack.open(sheet);
    stack.open(confirmation);

    expect(stack.isTop(confirmation)).toBe(true);
    expect(stack.isTop(sheet)).toBe(false);
  });

  it('marca como coberta só a camada que tem outra por cima', () => {
    const stack = createLayerStack();
    const sheet = Symbol('sheet');
    const confirmation = Symbol('confirmation');

    stack.open(sheet);
    stack.open(confirmation);

    expect(stack.isCovered(sheet)).toBe(true);
    expect(stack.isCovered(confirmation)).toBe(false);
  });

  it('devolve o topo à camada de baixo quando a de cima fecha', () => {
    const stack = createLayerStack();
    const sheet = Symbol('sheet');
    const confirmation = Symbol('confirmation');
    stack.open(sheet);
    stack.open(confirmation);

    stack.close(confirmation);

    expect(stack.isTop(sheet)).toBe(true);
    expect(stack.isCovered(sheet)).toBe(false);
  });

  it('não considera coberta nem de cima uma camada que não está aberta', () => {
    const stack = createLayerStack();
    const closed = Symbol('closed');

    stack.close(closed);

    expect(stack.isTop(closed)).toBe(false);
    expect(stack.isCovered(closed)).toBe(false);
  });

  it('avisa os inscritos a cada abertura e fechamento até a inscrição acabar', () => {
    const stack = createLayerStack();
    const layer = Symbol('layer');
    const listener = vi.fn();
    const unsubscribe = stack.subscribe(listener);

    stack.open(layer);
    stack.close(layer);
    unsubscribe();
    stack.open(layer);

    expect(listener).toHaveBeenCalledTimes(2);
  });
});

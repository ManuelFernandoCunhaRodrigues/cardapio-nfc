import { describe, expect, it, vi } from 'vitest';

import { HIGHLIGHT_ROTATION_MS, HighlightCarouselController, highlightSummary, nextHighlightIndex, shouldAutoAdvance } from './highlight-carousel';

const unpaused = { explicit: false, pointer: false, focus: false, hidden: false, offscreen: false, reducedMotion: false };

describe('carrossel de destaques', () => {
  it('avança em 6 segundos e volta ao primeiro', () => {
    vi.useFakeTimers();
    const advanced: number[] = [];
    const controller = new HighlightCarouselController(2, (index) => advanced.push(index));
    vi.advanceTimersByTime(HIGHLIGHT_ROTATION_MS);
    vi.advanceTimersByTime(HIGHLIGHT_ROTATION_MS);
    expect(advanced).toEqual([1, 0]);
    controller.destroy();
    vi.useRealTimers();
  });

  it('não agenda temporizador com zero ou um destaque', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    new HighlightCarouselController(0, callback);
    new HighlightCarouselController(1, callback);
    vi.advanceTimersByTime(HIGHLIGHT_ROTATION_MS * 2);
    expect(callback).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it.each(['pointer', 'focus', 'hidden', 'offscreen', 'reducedMotion'] as const)('pausa e retoma por %s', (reason) => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const controller = new HighlightCarouselController(2, callback);
    controller.setPause(reason, true);
    vi.advanceTimersByTime(HIGHLIGHT_ROTATION_MS);
    expect(callback).not.toHaveBeenCalled();
    controller.setPause(reason, false);
    vi.advanceTimersByTime(HIGHLIGHT_ROTATION_MS);
    expect(callback).toHaveBeenCalledWith(1);
    controller.destroy();
    vi.useRealTimers();
  });

  it('não retoma depois de pausa explícita enquanto outra pausa acaba', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const controller = new HighlightCarouselController(2, callback);
    controller.setPause('explicit', true);
    controller.setPause('pointer', true);
    controller.setPause('pointer', false);
    vi.advanceTimersByTime(HIGHLIGHT_ROTATION_MS);
    expect(callback).not.toHaveBeenCalled();
    controller.destroy();
    vi.useRealTimers();
  });

  it('expõe as decisões puras de ciclo e pausa', () => {
    expect(nextHighlightIndex(2, 3)).toBe(0);
    expect(shouldAutoAdvance(2, unpaused)).toBe(true);
    expect(shouldAutoAdvance(2, { ...unpaused, explicit: true })).toBe(false);
  });

  it('mostra o aviso do painel somente a partir de nove ativos', () => {
    expect(highlightSummary(Array.from({ length: 8 }, () => ({ is_active: true })))).toMatchObject({ active: 8, total: 8, showWarning: false });
    expect(highlightSummary(Array.from({ length: 9 }, () => ({ is_active: true })))).toMatchObject({ active: 9, total: 9, showWarning: true });
  });
});

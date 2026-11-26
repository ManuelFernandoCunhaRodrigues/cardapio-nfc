import { afterEach, describe, expect, it, vi } from 'vitest';

import { listenScrollEnd, SCROLL_IDLE_MS } from './listen-scroll-end';

function fakeWindow(supportsScrollEnd: boolean): EventTarget {
  const target: EventTarget & { onscrollend?: null } = new EventTarget();
  if (supportsScrollEnd) target.onscrollend = null;
  return target;
}

describe('fim da rolagem', () => {
  afterEach(() => vi.useRealTimers());

  it('usa o evento scrollend quando o navegador tem', () => {
    const target = fakeWindow(true);
    const onScrollEnd = vi.fn();
    const stop = listenScrollEnd(target, onScrollEnd);

    target.dispatchEvent(new Event('scroll'));
    expect(onScrollEnd).not.toHaveBeenCalled();
    target.dispatchEvent(new Event('scrollend'));
    expect(onScrollEnd).toHaveBeenCalledOnce();

    stop();
    target.dispatchEvent(new Event('scrollend'));
    expect(onScrollEnd).toHaveBeenCalledOnce();
  });

  it('sem scrollend, avisa uma vez depois que a rolagem fica parada', () => {
    vi.useFakeTimers();
    const target = fakeWindow(false);
    const onScrollEnd = vi.fn();
    const stop = listenScrollEnd(target, onScrollEnd);

    target.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(SCROLL_IDLE_MS - 1);
    target.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(SCROLL_IDLE_MS - 1);
    expect(onScrollEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onScrollEnd).toHaveBeenCalledOnce();

    target.dispatchEvent(new Event('scroll'));
    stop();
    vi.advanceTimersByTime(SCROLL_IDLE_MS);
    expect(onScrollEnd).toHaveBeenCalledOnce();
  });
});

export const HIGHLIGHT_ROTATION_MS = 6_000;

export type CarouselPauseState = {
  explicit: boolean;
  pointer: boolean;
  focus: boolean;
  hidden: boolean;
  offscreen: boolean;
  reducedMotion: boolean;
};

export function nextHighlightIndex(current: number, count: number) {
  return count > 0 ? (current + 1) % count : 0;
}

export function previousHighlightIndex(current: number, count: number) {
  return count > 0 ? (current - 1 + count) % count : 0;
}

export function getRelativeSlideOffsets(
  trackOffsetLeft: number,
  slideOffsetLefts: readonly number[],
): number[] {
  return slideOffsetLefts.map((offsetLeft) => offsetLeft - trackOffsetLeft);
}

export function getClosestHighlightIndex(
  scrollLeft: number,
  slideOffsets: readonly number[],
): number {
  if (slideOffsets.length === 0) return 0;
  return slideOffsets.reduce(
    (closest, offset, index) =>
      Math.abs(offset - scrollLeft) < Math.abs(slideOffsets[closest] - scrollLeft)
        ? index
        : closest,
    0,
  );
}

export function shouldAutoAdvance(count: number, paused: CarouselPauseState) {
  return count > 1 && !Object.values(paused).some(Boolean);
}

export type CarouselTimer = Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'>;

export class HighlightCarouselController {
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private index = 0;
  private paused: CarouselPauseState = {
    explicit: false,
    pointer: false,
    focus: false,
    hidden: false,
    offscreen: false,
    reducedMotion: false,
  };

  constructor(
    private readonly count: number,
    private readonly onAdvance: (index: number) => void,
    private readonly timer: CarouselTimer = globalThis,
  ) {
    this.restart();
  }

  setPause(reason: keyof CarouselPauseState, value: boolean) {
    this.paused = { ...this.paused, [reason]: value };
    this.restart();
  }

  setIndex(index: number) {
    const nextIndex = Math.max(0, Math.min(index, this.count - 1));
    if (nextIndex === this.index) return;
    this.index = nextIndex;
    this.restart();
  }

  restart() {
    this.clear();
    if (!shouldAutoAdvance(this.count, this.paused)) return;
    this.timeout = this.timer.setTimeout(() => {
      this.index = nextHighlightIndex(this.index, this.count);
      this.onAdvance(this.index);
      this.restart();
    }, HIGHLIGHT_ROTATION_MS);
  }

  destroy() {
    this.clear();
  }

  private clear() {
    if (this.timeout !== undefined) this.timer.clearTimeout(this.timeout);
    this.timeout = undefined;
  }
}

export function highlightSummary(highlights: ReadonlyArray<{ is_active: boolean }>) {
  const active = highlights.filter((highlight) => highlight.is_active).length;
  return { active, total: highlights.length, showWarning: active > 8 };
}

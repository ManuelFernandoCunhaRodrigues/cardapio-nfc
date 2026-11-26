export type WheelInput = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
};

export type TrackMetrics = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
const LINE_HEIGHT_PX = 16;
// Um "dente" da roda do mouse passa de 50 px no Chrome, no Edge e no Safari; o touchpad manda
// pedaços menores e quase sempre com um pouco de deltaX.
const MIN_MOUSE_WHEEL_DELTA_PX = 50;
const EDGE_TOLERANCE_PX = 1;

/**
 * Quanto uma faixa lateral deve andar com a roda do mouse, ou `null` para deixar o navegador seguir
 * (rolar a página, dar zoom ou rolar de lado pelo touchpad). No celular não há evento de roda.
 */
export function getHorizontalWheelDelta(wheel: WheelInput, track: TrackMetrics): number | null {
  if (wheel.ctrlKey || wheel.deltaX !== 0 || wheel.deltaY === 0) return null;
  const isLineOrPage = wheel.deltaMode === DOM_DELTA_LINE || wheel.deltaMode === DOM_DELTA_PAGE;
  if (!isLineOrPage && Math.abs(wheel.deltaY) < MIN_MOUSE_WHEEL_DELTA_PX) return null;

  const maxScroll = track.scrollWidth - track.clientWidth;
  if (maxScroll <= EDGE_TOLERANCE_PX) return null;

  const unit =
    wheel.deltaMode === DOM_DELTA_LINE
      ? LINE_HEIGHT_PX
      : wheel.deltaMode === DOM_DELTA_PAGE
        ? track.clientWidth
        : 1;
  const delta = wheel.deltaY * unit;
  // Na ponta da faixa, a roda volta a rolar a página.
  if (delta < 0 && track.scrollLeft <= EDGE_TOLERANCE_PX) return null;
  if (delta > 0 && track.scrollLeft >= maxScroll - EDGE_TOLERANCE_PX) return null;
  return delta;
}

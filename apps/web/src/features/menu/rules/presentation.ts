const STORE_TIME_ZONE = 'America/Sao_Paulo';

export function splitLastWord(value: string): { leading: string; last: string } {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { leading: '', last: words[0] ?? '' };
  return { leading: words.slice(0, -1).join(' '), last: words.at(-1) ?? '' };
}

export function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'itens'}`;
}

export function getProductCardWidth(viewportWidth: number, margin = 16, gap = 12): number {
  return (viewportWidth - margin - 2 * gap) / 2.5;
}

export function formatStoreStatusTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STORE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** "hoje às 08:00", "amanhã às 08:00" ou "segunda às 08:00", pelo calendário de São Paulo. */
export function formatNextOpening(opensAt: Date, now: Date): string {
  const time = formatStoreStatusTime(opensAt);
  const daysAhead = getSaoPauloDayNumber(opensAt) - getSaoPauloDayNumber(now);
  if (daysAhead === 0) return `hoje às ${time}`;
  if (daysAhead === 1) return `amanhã às ${time}`;
  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: STORE_TIME_ZONE, weekday: 'long' })
    .format(opensAt)
    .replace('-feira', '');
  return `${weekday} às ${time}`;
}

// Dias desde 1970 pela data do calendário de São Paulo (não pelas 24 horas corridas).
function getSaoPauloDayNumber(date: Date): number {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function getSaoPauloWeekday(date: Date): number {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIME_ZONE,
    weekday: 'short',
  }).format(date);
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[
    value
  ];
}

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
  return (viewportWidth - margin - (2 * gap)) / 2.5;
}

export function formatStoreStatusTime(date: Date, includeWeekday = false): string {
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: STORE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  if (!includeWeekday) return time;
  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: STORE_TIME_ZONE, weekday: 'long' }).format(date).replace('-feira', '');
  return `${weekday} às ${time}`;
}

export function getSaoPauloWeekday(date: Date): number {
  const value = new Intl.DateTimeFormat('en-US', { timeZone: STORE_TIME_ZONE, weekday: 'short' }).format(date);
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[value];
}

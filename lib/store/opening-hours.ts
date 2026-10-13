import type { OpeningHour } from '@/lib/validators/store-settings';

const STORE_TIME_ZONE = 'America/Sao_Paulo';

export type StatusSettings = {
  opening_hours: OpeningHour[];
  status_override: 'auto' | 'open' | 'closed';
};

export type StoreStatus = {
  isOpen: boolean;
  reason: 'override-open' | 'override-closed' | 'within-hours' | 'outside-hours' | 'closed-today';
  closesAt?: Date;
  opensNext?: Date;
};

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

function getLocalDateTime(date: Date): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: weekdays[values.weekday],
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function localDateForOffset(
  local: LocalDateTime,
  offset: number,
): Pick<LocalDateTime, 'year' | 'month' | 'day'> {
  const date = new Date(Date.UTC(local.year, local.month - 1, local.day + offset));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function toUtc(localDate: Pick<LocalDateTime, 'year' | 'month' | 'day'>, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  let candidate = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day, hour, minute),
  );
  const desired = Date.UTC(localDate.year, localDate.month - 1, localDate.day, hour, minute);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getLocalDateTime(candidate);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const difference = desired - actualAsUtc;
    if (difference === 0) break;
    candidate = new Date(candidate.getTime() + difference);
  }

  return candidate;
}

function minutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function nextOpening(hours: OpeningHour[], localNow: LocalDateTime): Date | undefined {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (localNow.weekday + offset) % 7;
    const schedule = hours.find((hour) => hour.day === day);
    if (!schedule || schedule.closed) continue;
    if (offset === 0 && minutes(schedule.open) <= localNow.hour * 60 + localNow.minute) continue;
    return toUtc(localDateForOffset(localNow, offset), schedule.open);
  }
  return undefined;
}

export function getStoreStatus(settings: StatusSettings, now: Date): StoreStatus {
  if (settings.status_override === 'open') return { isOpen: true, reason: 'override-open' };
  if (settings.status_override === 'closed') return { isOpen: false, reason: 'override-closed' };

  const localNow = getLocalDateTime(now);
  const schedule = settings.opening_hours.find((hour) => hour.day === localNow.weekday);
  if (!schedule || schedule.closed) {
    return {
      isOpen: false,
      reason: 'closed-today',
      opensNext: nextOpening(settings.opening_hours, localNow),
    };
  }

  const nowMinutes = localNow.hour * 60 + localNow.minute;
  if (nowMinutes >= minutes(schedule.open) && nowMinutes < minutes(schedule.close)) {
    return { isOpen: true, reason: 'within-hours', closesAt: toUtc(localNow, schedule.close) };
  }

  return {
    isOpen: false,
    reason: 'outside-hours',
    opensNext: nextOpening(settings.opening_hours, localNow),
  };
}

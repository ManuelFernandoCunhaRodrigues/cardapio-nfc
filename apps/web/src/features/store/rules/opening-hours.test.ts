import { describe, expect, it } from 'vitest';

import { getStoreStatus } from '@/features/store/rules/opening-hours';

const hours = [
  { day: 0, closed: true, open: '08:00', close: '18:00' },
  { day: 1, closed: false, open: '08:00', close: '18:00' },
  { day: 2, closed: false, open: '08:00', close: '18:00' },
  { day: 3, closed: false, open: '08:00', close: '18:00' },
  { day: 4, closed: false, open: '08:00', close: '18:00' },
  { day: 5, closed: false, open: '08:00', close: '18:00' },
  { day: 6, closed: false, open: '08:00', close: '18:00' },
] as const;

describe('getStoreStatus', () => {
  it('indica que está aberta e informa o fechamento durante o horário', () => {
    const status = getStoreStatus(
      { opening_hours: [...hours], status_override: 'auto' },
      new Date('2026-10-05T14:00:00Z'),
    );
    expect(status).toMatchObject({ isOpen: true, reason: 'within-hours' });
    expect(status.closesAt?.toISOString()).toBe('2026-10-05T21:00:00.000Z');
  });

  it('indica a próxima abertura fora do horário', () => {
    const status = getStoreStatus(
      { opening_hours: [...hours], status_override: 'auto' },
      new Date('2026-10-05T22:00:00Z'),
    );
    expect(status).toMatchObject({ isOpen: false, reason: 'outside-hours' });
    expect(status.opensNext?.toISOString()).toBe('2026-10-06T11:00:00.000Z');
  });

  it('respeita dia fechado e encontra a próxima abertura', () => {
    const status = getStoreStatus(
      { opening_hours: [...hours], status_override: 'auto' },
      new Date('2026-10-04T15:00:00Z'),
    );
    expect(status).toMatchObject({ isOpen: false, reason: 'closed-today' });
    expect(status.opensNext?.toISOString()).toBe('2026-10-05T11:00:00.000Z');
  });

  it('faz o override manual prevalecer', () => {
    expect(
      getStoreStatus(
        { opening_hours: [...hours], status_override: 'open' },
        new Date('2026-10-04T15:00:00Z'),
      ),
    ).toMatchObject({ isOpen: true, reason: 'override-open' });
    expect(
      getStoreStatus(
        { opening_hours: [...hours], status_override: 'closed' },
        new Date('2026-10-05T14:00:00Z'),
      ),
    ).toMatchObject({ isOpen: false, reason: 'override-closed' });
  });

  it('calcula usando São Paulo, não UTC', () => {
    const status = getStoreStatus(
      { opening_hours: [...hours], status_override: 'auto' },
      new Date('2026-10-05T22:00:00Z'),
    );
    expect(status).toMatchObject({ isOpen: false, reason: 'outside-hours' });
  });
});

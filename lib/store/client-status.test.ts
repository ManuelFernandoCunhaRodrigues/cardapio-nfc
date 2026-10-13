import { describe, expect, it } from 'vitest';

import { getClientStoreStatus } from '@/lib/store/client-status';

const openingHours = Array.from({ length: 7 }, (_, day) => ({ day, closed: false, open: '08:00', close: '18:00' }));

describe('decisao de status no cliente', () => {
  it('muda exatamente no fechamento em Sao Paulo', () => {
    const settings = { opening_hours: openingHours, status_override: 'auto' as const };
    expect(getClientStoreStatus(settings, new Date('2026-10-12T20:59:59.000Z')).isOpen).toBe(true);
    expect(getClientStoreStatus(settings, new Date('2026-10-12T21:00:00.000Z')).isOpen).toBe(false);
  });

  it('faz o fechamento manual prevalecer durante o horario', () => {
    const settings = { opening_hours: openingHours, status_override: 'closed' as const };
    expect(getClientStoreStatus(settings, new Date('2026-10-12T15:00:00.000Z'))).toMatchObject({ isOpen: false, reason: 'override-closed' });
  });
});

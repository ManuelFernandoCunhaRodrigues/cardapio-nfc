import { describe, expect, it } from 'vitest';

import { getProductAvailabilityNotice } from './product-availability';

const mondayAtEight = new Date('2026-10-05T11:00:00.000Z');

describe('aviso de disponibilidade do produto', () => {
  it('diz "Disponível agora" só com a loja aberta', () => {
    expect(getProductAvailabilityNotice(true, { isOpen: true, reason: 'within-hours' })).toEqual({
      tone: 'available',
      text: 'Disponível agora',
    });
  });

  it('com a loja fechada, diz que está disponível no horário e quando a loja abre', () => {
    expect(
      getProductAvailabilityNotice(true, {
        isOpen: false,
        reason: 'outside-hours',
        opensNext: mondayAtEight,
      }),
    ).toEqual({
      tone: 'store-closed',
      text: 'Disponível no horário da loja · abre segunda às 08:00',
    });
  });

  it('com a loja fechada sem próxima abertura, não promete horário', () => {
    const notice = getProductAvailabilityNotice(true, {
      isOpen: false,
      reason: 'override-closed',
    });
    expect(notice).toEqual({ tone: 'store-closed', text: 'Disponível no horário da loja' });
    expect(notice.text).not.toMatch(/agora/i);
  });

  it('produto indisponível continua indisponível, com a loja aberta ou fechada', () => {
    for (const isOpen of [true, false]) {
      expect(
        getProductAvailabilityNotice(false, {
          isOpen,
          reason: isOpen ? 'override-open' : 'closed-today',
        }).tone,
      ).toBe('unavailable');
    }
  });
});

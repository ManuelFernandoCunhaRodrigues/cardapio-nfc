import { describe, expect, it } from 'vitest';

import { getProductAvailabilityNotice } from './product-availability';

const mondayAtEight = new Date('2026-10-05T11:00:00.000Z');
// Sábado à noite: a abertura de segunda sai com o dia da semana.
const saturdayNight = new Date('2026-10-03T23:00:00.000Z');

describe('aviso de disponibilidade do produto', () => {
  it('diz "Disponível agora" só com a loja aberta', () => {
    expect(
      getProductAvailabilityNotice(true, { isOpen: true, reason: 'within-hours' }, saturdayNight),
    ).toEqual({
      tone: 'available',
      text: 'Disponível agora',
    });
  });

  it('com a loja fechada, diz que está disponível no horário e quando a loja abre', () => {
    expect(
      getProductAvailabilityNotice(
        true,
        {
          isOpen: false,
          reason: 'outside-hours',
          opensNext: mondayAtEight,
        },
        saturdayNight,
      ),
    ).toEqual({
      tone: 'store-closed',
      text: 'Disponível no horário da loja · abre segunda às 08:00',
    });
  });

  it('com a loja fechada sem próxima abertura, não promete horário', () => {
    const notice = getProductAvailabilityNotice(
      true,
      { isOpen: false, reason: 'override-closed' },
      saturdayNight,
    );
    expect(notice).toEqual({ tone: 'store-closed', text: 'Disponível no horário da loja' });
    expect(notice.text).not.toMatch(/agora/i);
  });

  it('com a loja abrindo mais tarde no mesmo dia, diz "hoje"', () => {
    expect(
      getProductAvailabilityNotice(
        true,
        { isOpen: false, reason: 'outside-hours', opensNext: mondayAtEight },
        new Date('2026-10-05T09:00:00.000Z'),
      ).text,
    ).toBe('Disponível no horário da loja · abre hoje às 08:00');
  });

  it('produto indisponível continua indisponível, com a loja aberta ou fechada', () => {
    for (const isOpen of [true, false]) {
      expect(
        getProductAvailabilityNotice(
          false,
          { isOpen, reason: isOpen ? 'override-open' : 'closed-today' },
          saturdayNight,
        ).tone,
      ).toBe('unavailable');
    }
  });
});

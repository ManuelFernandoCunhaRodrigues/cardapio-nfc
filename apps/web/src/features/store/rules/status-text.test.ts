import { describe, expect, it } from 'vitest';

import { getStoreStatusDetail, getStoreStatusLinkLabel } from './status-text';

// Segunda, 5 de outubro de 2026, em São Paulo.
const mondayAtEight = new Date('2026-10-05T11:00:00.000Z');
const mondayAtSix = new Date('2026-10-05T09:00:00.000Z');
const mondayAtSixPm = new Date('2026-10-05T21:00:00.000Z');

describe('textos do status da loja', () => {
  it('aberta: diz quando fecha', () => {
    expect(
      getStoreStatusDetail(
        { isOpen: true, reason: 'within-hours', closesAt: mondayAtSixPm },
        mondayAtEight,
      ),
    ).toBe('Fecha às 18:00');
    expect(getStoreStatusDetail({ isOpen: true, reason: 'override-open' }, mondayAtEight)).toBe(
      'Atendendo agora',
    );
  });

  it('fechada antes de abrir no mesmo dia: "Abre hoje às 08:00"', () => {
    expect(
      getStoreStatusDetail(
        { isOpen: false, reason: 'outside-hours', opensNext: mondayAtEight },
        mondayAtSix,
      ),
    ).toBe('Abre hoje às 08:00');
  });

  it('fechada sem próxima abertura não promete horário', () => {
    expect(getStoreStatusDetail({ isOpen: false, reason: 'override-closed' }, mondayAtSix)).toBe(
      'Fechada no momento',
    );
  });

  it('a pílula do topo diz o estado da loja e para onde leva', () => {
    expect(getStoreStatusLinkLabel(true)).toBe('Loja aberta: ver horários');
    expect(getStoreStatusLinkLabel(false)).toBe('Loja fechada: ver horários');
  });
});

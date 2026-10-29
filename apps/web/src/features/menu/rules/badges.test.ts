import { describe, expect, it } from 'vitest';

import { getBadgeLabel } from '@/features/menu/rules/badges';

describe('getBadgeLabel', () => {
  it('mapeia os badges internos para os rótulos da interface', () => {
    expect(getBadgeLabel('mais_pedido')).toBe('MAIS PEDIDO');
    expect(getBadgeLabel('novo')).toBe('NOVO');
    expect(getBadgeLabel('quentinho')).toBe('QUENTINHO');
    expect(getBadgeLabel(null)).toBeNull();
  });
});

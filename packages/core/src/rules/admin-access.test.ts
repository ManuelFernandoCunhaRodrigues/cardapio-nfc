import { describe, expect, it } from 'vitest';

import { isActiveAdmin } from './admin-access';

describe('isActiveAdmin', () => {
  it('libera o administrador ativo', () => {
    expect(isActiveAdmin({ role: 'admin', is_active: true })).toBe(true);
  });

  it.each([
    ['sem perfil', null],
    ['administrador desativado', { role: 'admin', is_active: false }],
    ['outro papel', { role: 'editor', is_active: true }],
  ])('barra %s', (_label, profile) => {
    expect(isActiveAdmin(profile)).toBe(false);
  });
});

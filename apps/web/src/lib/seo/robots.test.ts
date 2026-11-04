import { describe, expect, it } from 'vitest';

import { getRobotsDisallow } from '@/lib/seo/robots';

describe('getRobotsDisallow', () => {
  it('bloqueia somente o painel em produção', () => {
    expect(getRobotsDisallow('production')).toEqual(['/admin']);
  });

  it('bloqueia toda a indexação em staging', () => {
    expect(getRobotsDisallow('staging')).toEqual(['/']);
  });
});

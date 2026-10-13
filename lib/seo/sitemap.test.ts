import { describe, expect, test } from 'vitest';

import { buildSitemap, getPublicSitemap } from './sitemap';

describe('buildSitemap', () => {
  test('inclui as páginas fixas e os produtos com data de atualização', () => {
    const sitemap = buildSitemap(new URL('https://salgae.com.br'), [
      { id: '6ac417ce-e9b5-496d-b5bf-2d07cd2d8197', updated_at: '2026-10-01T10:00:00.000Z' },
    ]);

    expect(sitemap).toHaveLength(4);
    expect(sitemap[0]).toEqual({ url: 'https://salgae.com.br/' });
    expect(sitemap[3]).toMatchObject({
      url: 'https://salgae.com.br/produto/6ac417ce-e9b5-496d-b5bf-2d07cd2d8197',
      lastModified: new Date('2026-10-01T10:00:00.000Z'),
    });
  });

  test('não expõe sitemap fora de produção ou sem URL pública', () => {
    const siteUrl = new URL('https://salgae.com.br');

    expect(getPublicSitemap('staging', siteUrl, [])).toEqual([]);
    expect(getPublicSitemap('production', undefined, [])).toEqual([]);
  });
});

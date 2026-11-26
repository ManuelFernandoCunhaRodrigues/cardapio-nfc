import { describe, expect, test } from 'vitest';

import { getPublicPageMetadata } from './public-page-metadata';

const store = { name: 'Lanchonete do Zé', tagline: 'Salgados quentes.' };

describe('getPublicPageMetadata', () => {
  test('a Início usa o nome e a frase curta da loja', () => {
    const metadata = getPublicPageMetadata('home', store);

    expect(metadata.title).toBe('Lanchonete do Zé');
    expect(metadata.description).toBe(
      'Salgados quentes. Cardápio digital da Lanchonete do Zé com fotos e preços.',
    );
    expect(metadata.alternates).toEqual({ canonical: '/' });
  });

  test('sem frase curta, a descrição da Início fica só com o texto padrão', () => {
    expect(getPublicPageMetadata('home', { ...store, tagline: null }).description).toBe(
      'Cardápio digital da Lanchonete do Zé com fotos e preços.',
    );
  });

  test.each([
    ['menu', 'Cardápio | Lanchonete do Zé', '/cardapio'],
    ['search', 'Busca | Lanchonete do Zé', '/busca'],
    ['info', 'Informações | Lanchonete do Zé', '/info'],
  ] as const)('%s tem título, endereço e prévia de compartilhamento', (page, title, path) => {
    const metadata = getPublicPageMetadata(page, store);

    expect(metadata.title).toBe(title);
    expect(metadata.alternates).toEqual({ canonical: path });
    expect(metadata.openGraph).toMatchObject({
      title,
      url: path,
      siteName: 'Lanchonete do Zé',
      locale: 'pt_BR',
      images: [{ url: '/brand/compartilhar.jpg', width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['/brand/compartilhar.jpg'],
    });
  });
});

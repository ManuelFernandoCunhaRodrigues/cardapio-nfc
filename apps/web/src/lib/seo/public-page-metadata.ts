import type { Metadata } from 'next';

import { buildShareMetadata } from './share-metadata';

export type StoreIdentity = { name: string; tagline: string | null };
type PublicPage = 'home' | 'menu' | 'search' | 'info';

const pages: Record<
  PublicPage,
  {
    path: string;
    title: (store: StoreIdentity) => string;
    description: (store: StoreIdentity) => string;
  }
> = {
  home: {
    path: '/',
    title: ({ name }) => name,
    description: ({ name, tagline }) =>
      [tagline?.replace(/[.!?…]+$/, ''), `Cardápio digital da ${name} com fotos e preços.`]
        .filter(Boolean)
        .join('. '),
  },
  menu: {
    path: '/cardapio',
    title: ({ name }) => `Cardápio | ${name}`,
    description: ({ name }) => `Todos os itens da ${name} por categoria, com fotos e preços.`,
  },
  search: {
    path: '/busca',
    title: ({ name }) => `Busca | ${name}`,
    description: ({ name }) => `Encontre salgados, combos e bebidas da ${name} pelo nome.`,
  },
  info: {
    path: '/info',
    title: ({ name }) => `Informações | ${name}`,
    description: ({ name }) => `Horários, endereço e contato da ${name}.`,
  },
};

/** Usa o nome e a frase curta cadastrados no painel. */
export function getPublicPageMetadata(page: PublicPage, store: StoreIdentity): Metadata {
  const { path, title, description } = pages[page];
  return buildShareMetadata({
    title: title(store),
    description: description(store),
    siteName: store.name,
    path,
  });
}

import {
  publicApiPaths,
  publicMenuResponseSchema,
  publicProductResponseSchema,
  publicSitemapResponseSchema,
  publicStoreResponseSchema,
  type PublicMenuResponse,
  type PublicProductResponse,
  type PublicSitemapItem,
  type PublicStoreResponse,
} from '@salgae/core/contracts/public-api';
import type { z } from 'zod';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { cacheTags } from '@/lib/cache/cache-tags';
import { embeddedApiFetch } from './embedded-api';

const PUBLIC_REVALIDATE_SECONDS = 60;

type PublicApiClientOptions = {
  fetchImplementation: typeof globalThis.fetch;
};

export function createPublicApiClient({ fetchImplementation }: PublicApiClientOptions) {
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    notFoundAsNull = false,
  ): Promise<T | null> {
    const response = await fetchImplementation(path);
    if (notFoundAsNull && response.status === 404) return null;
    if (!response.ok) throw new Error(`A API pública respondeu com status ${response.status}.`);
    return schema.parse(await response.json());
  }

  return {
    getMenu: () =>
      request(publicApiPaths.menu, publicMenuResponseSchema) as Promise<PublicMenuResponse>,
    getProduct: (slugOrId: string) =>
      request(
        publicApiPaths.product(slugOrId),
        publicProductResponseSchema,
        true,
      ) as Promise<PublicProductResponse | null>,
    getSitemap: () =>
      request(publicApiPaths.sitemap, publicSitemapResponseSchema) as Promise<PublicSitemapItem[]>,
    getStore: () =>
      request(publicApiPaths.store, publicStoreResponseSchema) as Promise<PublicStoreResponse>,
  };
}

function publicApiClient() {
  return createPublicApiClient({ fetchImplementation: embeddedApiFetch });
}

const getCachedPublicMenu = unstable_cache(() => publicApiClient().getMenu(), ['public-menu'], {
  revalidate: PUBLIC_REVALIDATE_SECONDS,
  tags: [cacheTags.menu],
});
const getCachedPublicSitemap = unstable_cache(
  () => publicApiClient().getSitemap(),
  ['public-sitemap'],
  { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [cacheTags.menu] },
);
const getCachedPublicStore = unstable_cache(() => publicApiClient().getStore(), ['public-store'], {
  revalidate: PUBLIC_REVALIDATE_SECONDS,
  tags: [cacheTags.store],
});

export const getPublicMenu = cache(() => getCachedPublicMenu());
export const getPublicProduct = cache((slugOrId: string) =>
  unstable_cache(() => publicApiClient().getProduct(slugOrId), ['public-product', slugOrId], {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: [cacheTags.menu, cacheTags.product(slugOrId)],
  })(),
);
export const getPublicSitemap = cache(() => getCachedPublicSitemap());
export const getPublicStore = cache(() => getCachedPublicStore());

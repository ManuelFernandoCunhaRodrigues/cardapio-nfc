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
import { cache } from 'react';

import { cacheTags } from '@/lib/cache/cache-tags';
import { getApiEnv } from '@/lib/env';
import { createTimeoutFetch } from './timeout-fetch';

const PUBLIC_REVALIDATE_SECONDS = 60;

type PublicApiClientOptions = {
  apiUrl: string;
  fetchImplementation?: typeof globalThis.fetch;
};

export function createPublicApiClient({
  apiUrl,
  fetchImplementation = globalThis.fetch,
}: PublicApiClientOptions) {
  const timedFetch = createTimeoutFetch(fetchImplementation);

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    tags: string[],
    notFoundAsNull = false,
  ): Promise<T | null> {
    const response = await timedFetch(`${apiUrl}${path}`, {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS, tags },
    });
    if (notFoundAsNull && response.status === 404) return null;
    if (!response.ok) throw new Error(`A API pública respondeu com status ${response.status}.`);
    return schema.parse(await response.json());
  }

  return {
    getMenu: () =>
      request(publicApiPaths.menu, publicMenuResponseSchema, [
        cacheTags.menu,
      ]) as Promise<PublicMenuResponse>,
    getProduct: (slugOrId: string) =>
      request(
        publicApiPaths.product(slugOrId),
        publicProductResponseSchema,
        [cacheTags.menu, cacheTags.product(slugOrId)],
        true,
      ) as Promise<PublicProductResponse | null>,
    getSitemap: () =>
      request(publicApiPaths.sitemap, publicSitemapResponseSchema, [cacheTags.menu]) as Promise<
        PublicSitemapItem[]
      >,
    getStore: () =>
      request(publicApiPaths.store, publicStoreResponseSchema, [
        cacheTags.store,
      ]) as Promise<PublicStoreResponse>,
  };
}

function publicApiClient() {
  return createPublicApiClient({ apiUrl: getApiEnv().API_URL });
}

export const getPublicMenu = cache(() => publicApiClient().getMenu());
export const getPublicProduct = cache((slugOrId: string) => publicApiClient().getProduct(slugOrId));
export const getPublicSitemap = cache(() => publicApiClient().getSitemap());
export const getPublicStore = cache(() => publicApiClient().getStore());

export const cacheTags = {
  menu: 'menu',
  store: 'store',
  product: (slugOrId: string) => `product:${slugOrId}`,
} as const;

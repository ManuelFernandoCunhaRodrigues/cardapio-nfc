import type { Product } from '@salgae/core/schemas/product';

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  image_path: string | null;
  sort_order: number;
};

export type MenuHighlight = {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  target: string | null;
  sort_order: number;
};

export type MenuProduct = Product;

import { HighlightsManager } from '@/features/highlights/components/highlights-manager';
import {
  getAdminCategories,
  getAdminHighlights,
  getAdminProducts,
} from '@/features/admin/server/catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function HighlightsPage() {
  const [highlights, categories, products] = await Promise.all([
    getAdminHighlights(),
    getAdminCategories(),
    getAdminProducts(),
  ]);
  return <HighlightsManager categories={categories} highlights={highlights} products={products} />;
}

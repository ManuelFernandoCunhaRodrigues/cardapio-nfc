import { HighlightsManager } from '@/components/admin/highlights-manager';
import { getAdminCategories, getAdminHighlights, getAdminProducts } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function HighlightsPage() {
  const [highlights, categories, products] = await Promise.all([
    getAdminHighlights(),
    getAdminCategories(),
    getAdminProducts(),
  ]);
  return <HighlightsManager categories={categories} highlights={highlights} products={products} />;
}

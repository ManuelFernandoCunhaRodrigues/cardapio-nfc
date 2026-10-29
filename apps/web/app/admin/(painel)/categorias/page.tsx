import { CategoryManager } from '@/components/admin/category-manager';
import { getAdminCategories } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  return <CategoryManager categories={await getAdminCategories()} />;
}

import { CategoryManager } from '@/features/categories/components/category-manager';
import { getAdminCategories } from '@/features/admin/server/catalog';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  return <CategoryManager categories={await getAdminCategories()} />;
}

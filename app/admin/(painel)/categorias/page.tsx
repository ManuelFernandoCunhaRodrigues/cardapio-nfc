import { CategoryManager } from '@/components/admin/category-manager';
import { getAdminCategories } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getAdminCategories();
  return <><header className="hidden border-b border-border pb-6 lg:block"><p className="lbl text-positive">Catálogo</p><h1 className="disp mt-2 text-3xl font-extrabold text-ink">Categorias</h1><p className="mt-2 text-sm text-muted">Organize o cardápio e mantenha URLs estáveis.</p></header><div className="lg:mt-7"><CategoryManager categories={categories} /></div></>;
}

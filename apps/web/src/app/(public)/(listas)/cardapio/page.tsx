import { CategoryNav } from '@/features/menu/components/category-nav';
import { ProductCard } from '@/features/menu/components/product-card';
import { ProductRow } from '@/features/menu/components/product-row';
import { getPublicMenu } from '@/lib/api/public-api-client';
import { formatItemCount } from '@/features/menu/rules/presentation';
import { sortProductsByAvailability } from '@salgae/core/rules/product-sort';

export const revalidate = 60;

export default async function CardapioPage() {
  const { categories, products } = await getPublicMenu();
  const productsByCategory = new Map(
    categories.map((category) => [
      category.id,
      sortProductsByAvailability(products.filter((product) => product.category_id === category.id)),
    ]),
  );
  return (
    <main className="pb-6">
      <h1 className="sr-only">Cardápio</h1>
      <CategoryNav categories={categories} />
      <div className="space-y-7 px-4 pt-1">
        {categories.length === 0 ? (
          <p className="rounded-card bg-white p-5 text-sm text-muted">
            O cardápio está em preparação. Consulte a equipe no balcão.
          </p>
        ) : (
          categories.map((category) => {
            const items = productsByCategory.get(category.id) ?? [];
            return (
              <section className="scroll-mt-14" id={category.slug} key={category.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="disp text-xl font-semibold text-ink">{category.name}</h2>
                  <span className="text-xs text-muted">{formatItemCount(items.length)}</span>
                </div>
                {items.length ? (
                  <ProductRow ariaLabel={`Produtos de ${category.name}`} className="mt-1">
                    {items.map((product) => (
                      <ProductCard compact key={product.id} product={product} />
                    ))}
                  </ProductRow>
                ) : (
                  <p className="mt-3 rounded-product bg-white p-4 text-sm text-muted">
                    Ainda não há itens nesta categoria.
                  </p>
                )}
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}

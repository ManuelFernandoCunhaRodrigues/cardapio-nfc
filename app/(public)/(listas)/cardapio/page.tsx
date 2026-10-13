import { CategoryNav } from '@/components/menu/category-nav';
import { ProductCard } from '@/components/menu/product-card';
import { ProductRow } from '@/components/menu/product-row';
import { getPublicCategories, getPublicProducts } from '@/lib/menu/get-public-menu';
import { formatItemCount } from '@/lib/menu/presentation';
import { sortProductsByAvailability } from '@/lib/menu/sort';

export const revalidate = 60;

export default async function CardapioPage() {
  const [categoriesResult, productsResult] = await Promise.all([
    getPublicCategories(),
    getPublicProducts(),
  ]);
  if (categoriesResult.error || productsResult.error)
    return (
      <main className="p-4">
        <h1 className="disp text-2xl font-bold text-ink">Cardápio</h1>
        <section className="mt-5 rounded-card border border-border bg-white p-5">
          <h2 className="disp text-xl font-bold text-ink">Não foi possível carregar agora</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Atualize a página em alguns instantes ou consulte a equipe no balcão.
          </p>
        </section>
      </main>
    );
  const categories = categoriesResult.data;
  const products = productsResult.data;
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

import { Card } from '@/components/ui/card';
import { reportServerError } from '@/lib/observability';
import { productSchema, type Product } from '@/lib/validators/product';
import { formatPriceBRL } from '@/lib/utils/format-price';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Category = { id: string; name: string; slug: string; sort_order: number };
export default async function MenuPage() {
  let menu: { categories: Category[]; products: Product[] } | null = null;

  try {
    const supabase = await createClient();
    const [categoriesResult, productsResult] = await Promise.all([
      supabase.from('categories').select('id, name, slug, sort_order').eq('is_active', true).order('sort_order'),
      supabase
        .from('products')
        .select('id, category_id, name, description, price_cents, image_path, video_path, is_active, is_available, sort_order')
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    if (categoriesResult.error || productsResult.error) throw new Error('Falha ao carregar o cardápio.');
    const categories = categoriesResult.data as Category[];
    const products: Product[] = (productsResult.data ?? []).map((product) => productSchema.parse(product));
    menu = { categories, products };
  } catch (error) {
    reportServerError('falha_ao_carregar_cardapio', error);
  }

  if (!menu) return <MenuShell><MenuError /></MenuShell>;
  if (menu.categories.length === 0) return <MenuShell><EmptyMenu /></MenuShell>;

  return (
    <MenuShell>
      <div className="space-y-8">
        {menu.categories.map((category) => {
          const categoryProducts = menu.products.filter((product) => product.category_id === category.id);
          return (
            <section aria-labelledby={`category-${category.id}`} key={category.id}>
              <h2 className="disp text-2xl font-bold text-ink" id={`category-${category.id}`}>{category.name}</h2>
              {categoryProducts.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Ainda não há itens disponíveis nesta categoria.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {categoryProducts.map((product) => (
                    <Card className="flex items-start justify-between gap-4" key={product.id}>
                      <div>
                        <h3 className="disp text-lg font-bold text-ink">{product.name}</h3>
                        {product.description ? <p className="mt-1 text-sm leading-6 text-muted">{product.description}</p> : null}
                        {!product.is_available ? <p className="mt-3 text-xs font-bold text-danger">Indisponível no momento</p> : null}
                      </div>
                      <p className="disp shrink-0 pt-1 text-base font-extrabold text-brand">{formatPriceBRL(product.price_cents)}</p>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </MenuShell>
  );
}

function MenuShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-10 max-w-xl">
        <p className="lbl text-positive">Cardápio local</p>
        <h1 className="disp mt-3 text-4xl font-extrabold text-ink sm:text-5xl">Salgaê Lanchonete</h1>
        <p className="mt-3 text-base leading-7 text-muted">Escolha seus favoritos e faça seu pedido diretamente no balcão.</p>
      </header>
      {children}
    </main>
  );
}

function EmptyMenu() {
  return <Card className="max-w-xl"><h2 className="disp text-xl font-bold text-ink">Cardápio em preparação</h2><p className="mt-2 text-sm leading-6 text-muted">Estamos organizando as opções para você. Consulte a equipe no balcão.</p></Card>;
}

function MenuError() {
  return <Card className="max-w-xl"><h2 className="disp text-xl font-bold text-ink">Não foi possível carregar o cardápio</h2><p className="mt-2 text-sm leading-6 text-muted">Tente atualizar a página em alguns instantes ou fale com a equipe no balcão.</p></Card>;
}

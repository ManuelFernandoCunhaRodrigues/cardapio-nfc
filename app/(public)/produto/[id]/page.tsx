import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackToMenu } from '@/components/menu/back-to-menu';
import { Icon } from '@/components/menu/icons';
import { MediaVideo } from '@/components/menu/media-video';
import { ProductCard } from '@/components/menu/product-card';
import { ProductRow } from '@/components/menu/product-row';
import { getBadgeLabel } from '@/lib/menu/badges';
import { getPublicCategories, getPublicProducts } from '@/lib/menu/get-public-menu';
import { sortProductsByAvailability } from '@/lib/menu/sort';
import { getPublicImageVariantUrl, getPublicMediaUrl } from '@/lib/media';
import { formatPriceBRL } from '@/lib/utils/format-price';

export const revalidate = 60;
type ProductPageProps = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return { title: 'Produto | Salgaê' };
  const result = await getPublicProducts();
  const product = result.data?.find((item) => item.id === id);
  return { title: product ? `${product.name} | Salgaê` : 'Produto | Salgaê' };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const [productsResult, categoriesResult] = await Promise.all([getPublicProducts(), getPublicCategories()]);
  if (productsResult.error || categoriesResult.error) return <main className="p-4 pt-6"><section className="rounded-card bg-white p-5"><h1 className="disp text-xl font-bold text-ink">Não foi possível abrir este item</h1><p className="mt-2 text-sm leading-6 text-muted">Tente novamente em instantes.</p><BackToMenu /></section></main>;
  const product = productsResult.data.find((item) => item.id === id);
  if (!product) notFound();
  const category = categoriesResult.data.find((item) => item.id === product.category_id);
  const related = sortProductsByAvailability(productsResult.data.filter((item) => item.category_id === product.category_id && item.id !== product.id));
  const badge = getBadgeLabel(product.badge);
  const cardImage = getPublicImageVariantUrl('product-images', product.image_path, 'card');
  const detailImage = getPublicImageVariantUrl('product-images', product.image_path, 'detail');
  const imageSrcSet = cardImage && detailImage ? `${cardImage} 640w, ${detailImage} 1600w` : undefined;

  return <main><div className="relative h-[min(340px,40svh)] min-h-[220px] overflow-hidden bg-ink"><div className={`h-full w-full ${!product.is_available ? 'grayscale opacity-50' : ''}`}><MediaVideo name={product.name} poster={detailImage} posterSrcSet={imageSrcSet} video={product.is_available ? getPublicMediaUrl('product-videos', product.video_path) : null} /></div><BackToMenu iconOnly />{product.video_path && product.is_available ? <span className="lbl absolute bottom-4 left-5 rounded-full bg-ink/85 px-2 py-1 text-white">VÍDEO CURTO · SEM SOM</span> : null}</div>
    <section className="relative -mt-7 min-h-[calc(100vh-313px)] rounded-t-[28px] bg-white px-5 pb-8 pt-6"><div className="flex flex-wrap items-center gap-2"><span className="lbl rounded-full bg-surface-inner px-2.5 py-1 text-muted">{category?.name ?? 'CARDÁPIO'}</span>{badge ? <span className="lbl rounded-full bg-ink px-2.5 py-1 text-white">{badge}</span> : null}{!product.is_available ? <span className="lbl rounded-full bg-danger px-2.5 py-1 text-white">INDISPONÍVEL</span> : null}</div><h1 className="disp mt-3 text-2xl font-bold leading-[30px] text-ink">{product.name}</h1><p className={`disp mt-1 text-[26px] font-bold leading-8 ${product.is_available ? 'text-brand-strong' : 'text-muted'}`}>{formatPriceBRL(product.price_cents)}</p>{product.description ? <p className="mt-4 text-sm leading-5 text-body">{product.description}</p> : null}<p className={`mt-4 flex items-start gap-2 rounded-product px-4 py-3 text-sm font-bold ${product.is_available ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'}`}><Icon height={18} name={product.is_available ? 'check' : 'alert'} width={18} /><span>{product.is_available ? 'Disponível agora' : 'Indisponível no momento — Pergunte ao atendente quando volta.'}</span></p><p className="mt-2 flex items-start gap-2 rounded-product border border-border bg-cream px-4 py-3 text-sm font-bold leading-5 text-body"><Icon className="shrink-0 text-muted" height={18} name="info" width={18} />Consulta apenas. Faça seu pedido com o atendente.</p><BackToMenu />
      {related.length ? <section className="mt-7" aria-labelledby="mais-da-categoria"><h2 className="disp text-lg font-semibold text-ink" id="mais-da-categoria">Mais de {category?.name ?? 'esta categoria'}</h2><ProductRow ariaLabel={`Mais produtos de ${category?.name ?? 'esta categoria'}`} className="mt-1">{related.map((item) => <ProductCard compact key={item.id} product={item} />)}</ProductRow></section> : null}
    </section>
  </main>;
}

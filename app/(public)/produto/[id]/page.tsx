import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Icon } from '@/components/menu/icons';
import { MediaVideo } from '@/components/menu/media-video';
import { getBadgeLabel } from '@/lib/menu/badges';
import { getPublicCategories, getPublicProducts } from '@/lib/menu/get-public-menu';
import { getPublicImageVariantUrl, getPublicMediaUrl } from '@/lib/media';
import { formatPriceBRL } from '@/lib/utils/format-price';

export const revalidate = 60;
type ProductPageProps = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: 'Produto | Salgaê' };
  const result = await getPublicProducts();
  const product = result.data?.find((item) => item.id === id);
  return { title: product ? `${product.name} | Salgaê` : 'Produto | Salgaê' };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [productsResult, categoriesResult] = await Promise.all([getPublicProducts(), getPublicCategories()]);
  if (productsResult.error || categoriesResult.error) return <main className="p-4 pt-6"><Link className="text-sm font-bold text-brand-strong" href="/cardapio">← Voltar ao cardápio</Link><section className="mt-5 rounded-card bg-cream p-5"><h1 className="disp text-xl font-bold text-ink">Não foi possível abrir este item</h1><p className="mt-2 text-sm leading-6 text-muted">Tente novamente em instantes.</p></section></main>;
  const product = productsResult.data.find((item) => item.id === id);
  if (!product) notFound();
  const category = categoriesResult.data.find((item) => item.id === product.category_id);
  const badge = getBadgeLabel(product.badge);
  const cardImage = getPublicImageVariantUrl('product-images', product.image_path, 'card');
  const detailImage = getPublicImageVariantUrl('product-images', product.image_path, 'detail');
  const imageSrcSet = cardImage && detailImage ? `${cardImage} 640w, ${detailImage} 1600w` : undefined;
  return <main><div className="relative h-[260px] overflow-hidden bg-ink"><div className={`h-full w-full ${!product.is_available ? 'grayscale opacity-50' : ''}`}><MediaVideo name={product.name} poster={detailImage} posterSrcSet={imageSrcSet} video={getPublicMediaUrl('product-videos', product.video_path)} /></div><Link aria-label="Voltar ao cardápio" className="absolute left-4 top-4 grid size-11 place-items-center rounded-full bg-white/95 text-ink shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/30" href="/cardapio"><Icon name="back" /></Link></div><section className="relative -mt-7 min-h-[calc(100vh-233px)] rounded-t-[28px] bg-white px-5 pb-8 pt-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-surface-inner px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.1em] text-muted">{category?.name ?? 'CARDÁPIO'}</span>{badge ? <span className="rounded-full bg-ink px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.1em] text-cream">{badge}</span> : null}{!product.is_available ? <span className="rounded-full bg-danger px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.1em] text-white">INDISPONÍVEL</span> : null}</div><h1 className="disp mt-4 text-[28px] font-extrabold leading-tight text-ink">{product.name}</h1><p className="disp mt-2 text-2xl font-extrabold text-brand-strong">{formatPriceBRL(product.price_cents)}</p>{product.description ? <p className="mt-5 text-sm leading-6 text-body">{product.description}</p> : null}<p className={`mt-5 rounded-product px-4 py-3 text-sm font-bold ${product.is_available ? 'bg-positive/10 text-positive' : 'bg-danger/10 text-danger'}`}>{product.is_available ? 'Disponível para consulta' : 'Indisponível no momento'}</p><p className="mt-4 rounded-product border border-border bg-cream px-4 py-3 text-sm font-semibold leading-6 text-body">Consulta apenas. Faça seu pedido com o atendente.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-3 text-sm font-bold text-cream focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/cardapio">Voltar ao cardápio</Link></section></main>;
}

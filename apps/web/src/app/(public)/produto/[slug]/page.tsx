import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { BackToMenu } from '@/features/menu/components/back-to-menu';
import { Icon } from '@/features/menu/components/icons';
import { MediaVideo } from '@/features/media/components/media-video';
import { ProductCard } from '@/features/menu/components/product-card';
import { ProductRow } from '@/features/menu/components/product-row';
import { getBadgeLabel } from '@salgae/core/rules/badges';
import { getPublicProduct, getPublicSitemap, getPublicStore } from '@/lib/api/public-api-client';
import { ProductAvailability } from '@/features/store/components/store-status-live';
import { selectPublicStoreStatusSettings } from '@/features/store/rules/client-status';
import { sortProductsByAvailability } from '@salgae/core/rules/product-sort';
import { getPublicImageVariantUrl, getPublicMediaUrl } from '@/features/media/rules/media-urls';
import { getProductMetadata } from '@/lib/seo/product-metadata';
import { formatPriceBRL } from '@salgae/core/rules/price';

export const revalidate = 60;
type ProductPageProps = { params: Promise<{ slug: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const badgeColor = {
  mais_pedido: 'bg-ink',
  novo: 'bg-green',
  quentinho: 'bg-brand-strong',
} as const;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [result, store] = await Promise.all([getPublicProduct(slug), getPublicStore()]);
  return getProductMetadata(
    result?.product ?? null,
    getPublicImageVariantUrl('product-images', result?.product.image_path, 'detail'),
    store.name,
  );
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const items = await getPublicSitemap();
  return items.map(({ slug }) => ({ slug }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const isLegacyId = UUID_PATTERN.test(slug);
  const [productPage, settings] = await Promise.all([getPublicProduct(slug), getPublicStore()]);
  if (!productPage) notFound();
  const { product, category } = productPage;
  if (isLegacyId) permanentRedirect(`/produto/${product.slug}`);
  const related = sortProductsByAvailability(productPage.relatedProducts);
  const badge = getBadgeLabel(product.badge);
  const cardImage = getPublicImageVariantUrl('product-images', product.image_path, 'card');
  const detailImage = getPublicImageVariantUrl('product-images', product.image_path, 'detail');
  const imageSrcSet =
    cardImage && detailImage ? `${cardImage} 640w, ${detailImage} 1600w` : undefined;

  return (
    <main>
      <div className="relative h-[min(340px,40svh)] min-h-[220px] overflow-hidden bg-ink">
        <div className={`h-full w-full ${!product.is_available ? 'grayscale opacity-50' : ''}`}>
          <MediaVideo
            name={product.name}
            poster={detailImage}
            posterSrcSet={imageSrcSet}
            video={
              product.is_available ? getPublicMediaUrl('product-videos', product.video_path) : null
            }
          />
        </div>
        <BackToMenu iconOnly />
        {product.video_path && product.is_available ? (
          <span className="lbl absolute right-5 top-5 rounded-full bg-ink/85 px-2 py-1 text-white">
            VÍDEO CURTO · SEM SOM
          </span>
        ) : null}
      </div>
      <section className="relative -mt-7 min-h-[calc(100vh-313px)] rounded-t-[28px] bg-white px-5 pb-8 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="lbl rounded-full bg-surface-inner px-2.5 py-1 text-muted">
            {category?.name ?? 'CARDÁPIO'}
          </span>
          {badge ? (
            <span
              className={`lbl rounded-full px-2.5 py-1 text-white ${product.badge ? badgeColor[product.badge] : 'bg-ink'}`}
            >
              {badge}
            </span>
          ) : null}
          {!product.is_available ? (
            <span className="lbl rounded-full bg-danger px-2.5 py-1 text-white">INDISPONÍVEL</span>
          ) : null}
        </div>
        <h1 className="disp mt-3 text-2xl font-bold leading-[30px] text-ink">{product.name}</h1>
        <p
          className={`disp mt-1 text-[26px] font-bold leading-8 ${product.is_available ? 'text-brand-strong' : 'text-muted'}`}
        >
          {formatPriceBRL(product.price_cents)}
        </p>
        {product.description ? (
          <p className="mt-4 text-sm leading-5 text-body">{product.description}</p>
        ) : null}
        <ProductAvailability
          initialNow={new Date().toISOString()}
          isAvailable={product.is_available}
          settings={selectPublicStoreStatusSettings(settings)}
        />
        <p className="mt-2 flex items-start gap-2 rounded-product border border-border bg-cream px-4 py-3 text-sm font-bold leading-5 text-body">
          <Icon className="shrink-0 text-muted" height={18} name="info" width={18} />
          Consulta apenas. Faça seu pedido com o atendente.
        </p>
        <BackToMenu />
        {related.length ? (
          <section className="mt-7" aria-labelledby="mais-da-categoria">
            <h2 className="disp text-lg font-semibold text-ink" id="mais-da-categoria">
              Mais de {category?.name ?? 'esta categoria'}
            </h2>
            <ProductRow
              ariaLabel={`Mais produtos de ${category?.name ?? 'esta categoria'}`}
              className="mt-1"
            >
              {related.map((item) => (
                <ProductCard compact key={item.id} product={item} />
              ))}
            </ProductRow>
          </section>
        ) : null}
      </section>
    </main>
  );
}

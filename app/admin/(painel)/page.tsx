import Link from 'next/link';

import { AdminIcon } from '@/components/admin/admin-icon';
import { MediaImage } from '@/components/menu/media-image';
import { Card } from '@/components/ui/card';
import { getAdminCategories, getAdminProducts } from '@/lib/admin/catalog';
import { productsNeedingAttention } from '@/lib/admin/panel';
import { getPublicImageVariantUrl } from '@/lib/media';
import { getSaoPauloWeekday } from '@/lib/menu/presentation';
import { getStoreSettings } from '@/lib/store/get-store-settings';
import { getStoreStatus } from '@/lib/store/opening-hours';
import { formatPriceBRL } from '@/lib/utils/format-price';

export const dynamic = 'force-dynamic';

const reasonLabel = { unavailable: 'INDISPONÍVEL', 'without-image': 'SEM FOTO' } as const;

export default async function AdminDashboardPage() {
  const [products, categories, settings] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
    getStoreSettings(),
  ]);
  const active = products.filter((product) => product.is_active).length;
  const unavailable = products.filter(
    (product) => product.is_active && !product.is_available,
  ).length;
  const withoutImage = products.filter((product) => !product.image_path).length;
  const attention = productsNeedingAttention(products);
  const now = new Date();
  const status = settings ? getStoreStatus(settings, now) : null;
  const today = settings?.opening_hours.find((hour) => hour.day === getSaoPauloWeekday(now));
  const cards = [
    {
      label: 'Produtos ativos',
      value: active,
      detail: 'Aparecem no cardápio',
      href: '/admin/produtos',
    },
    {
      label: 'Indisponíveis',
      value: unavailable,
      detail: 'Seguem visíveis com aviso',
      href: '/admin/produtos?filtro=indisponiveis',
      attention: unavailable > 0,
    },
    {
      label: 'Sem foto',
      value: withoutImage,
      detail: 'Usam a imagem padrão',
      href: '/admin/produtos?filtro=sem-foto',
      attention: withoutImage > 0,
    },
    {
      label: 'Categorias',
      value: categories.length,
      detail: 'Organizam o cardápio',
      href: '/admin/categorias',
    },
  ];
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(now);
  // "Ver todos" leva ao filtro que cobre mais itens da lista (não há um filtro que junte os dois motivos).
  const attentionHref =
    unavailable > withoutImage
      ? '/admin/produtos?filtro=indisponiveis'
      : '/admin/produtos?filtro=sem-foto';
  const quickLinks = [
    {
      href: '/admin/produtos/novo',
      title: 'Novo produto',
      detail: 'Nome, preço, foto e vídeo',
      icon: 'plus' as const,
    },
    {
      href: '/admin/categorias?nova=1',
      title: 'Nova categoria',
      detail: 'Organize a navegação',
      icon: 'tag' as const,
    },
    {
      href: '/admin/destaques?novo=1',
      title: 'Novo destaque',
      detail: 'Banner da tela inicial',
      icon: 'star' as const,
    },
  ];

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="disp text-2xl font-bold text-ink lg:text-[28px]">Resumo</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="hidden lg:inline">{formattedDate} · </span>Veja como está o cardápio
            hoje.
          </p>
        </div>
        <div className="hidden gap-3 lg:flex">
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-5 text-sm font-bold text-ink"
            href="/cardapio"
            target="_blank"
          >
            Ver cardápio
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-full bg-brand-strong px-5 text-sm font-bold text-white shadow-brand"
            href="/admin/produtos/novo"
          >
            Novo produto
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            className="rounded-card bg-white p-4 shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
            href={card.href}
            key={card.label}
          >
            <p className="lbl text-muted">{card.label}</p>
            <p
              className={`disp mt-2 text-[32px] font-bold leading-none ${card.attention ? 'text-brand-strong' : 'text-ink'}`}
            >
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-4 text-muted">{card.detail}</p>
          </Link>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:hidden">
        {quickLinks.map((item, index) => (
          <Link
            className={`flex min-h-[72px] items-center gap-3 rounded-xl border border-border bg-white p-3 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 ${index === 2 ? 'col-span-2' : ''}`}
            href={item.href}
            key={item.href}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach text-brand-strong">
              <AdminIcon name={item.icon} />
            </span>
            <span className="min-w-0">
              <strong className="block font-[family-name:var(--font-poppins)] text-sm text-ink">
                {item.title}
              </strong>
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <Card className="border-0 bg-white p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="disp text-lg font-semibold text-ink">Precisam de atenção</h2>
            {attention.length > 8 ? (
              <Link
                className="min-h-11 rounded-full px-3 text-sm font-bold text-brand-strong underline"
                href={attentionHref}
              >
                Ver todos ({attention.length})
              </Link>
            ) : null}
          </div>
          {attention.length ? (
            <ul className="mt-2 divide-y divide-border-inner">
              {attention.slice(0, 8).map(({ product, reasons }) => (
                <li key={product.id}>
                  <Link
                    className="flex min-h-[62px] items-center gap-3 py-2 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
                    href={`/admin/produtos/${product.id}`}
                  >
                    <MediaImage
                      alt=""
                      className="size-10 shrink-0 rounded-lg"
                      name={product.name}
                      src={getPublicImageVariantUrl('product-images', product.image_path, 'card')}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate font-[family-name:var(--font-poppins)] text-sm text-ink">
                        {product.name}
                      </strong>
                      <span className="hidden text-xs text-muted lg:block">
                        {product.category?.name ?? 'Sem categoria'} ·{' '}
                        {formatPriceBRL(product.price_cents)}
                      </span>
                    </span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {reasons.map((reason) => (
                        <span
                          className={`rounded-full px-2 py-1 font-[family-name:var(--font-poppins)] text-[9px] font-semibold ${reason === 'unavailable' ? 'bg-amber-soft text-body' : 'bg-surface-inner text-body'}`}
                          key={reason}
                        >
                          {reasonLabel[reason]}
                        </span>
                      ))}
                    </span>
                    <AdminIcon
                      className="shrink-0 text-muted"
                      name="down"
                      style={{ transform: 'rotate(-90deg)' }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-green-soft px-3 py-3 text-sm font-bold text-green">
              Tudo certo por aqui.
            </p>
          )}
        </Card>
        <Card className="hidden border-0 bg-white lg:block">
          <div className="flex items-center justify-between gap-3">
            <h2 className="disp text-lg font-semibold text-ink">Loja hoje</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status?.isOpen ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'}`}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {status?.isOpen ? 'Aberta' : 'Fechada'}
            </span>
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-peach text-brand-strong">
                <AdminIcon height={17} name="clock" width={17} />
              </span>
              <div>
                <dt className="text-xs text-muted">Horário de hoje</dt>
                <dd className="font-bold text-ink">
                  {today?.closed
                    ? 'Fechada'
                    : today
                      ? `${today.open} às ${today.close}`
                      : 'Não informado'}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-peach text-brand-strong">
                <AdminIcon height={17} name="alert" width={17} />
              </span>
              <div>
                <dt className="text-xs text-muted">Aviso no cardápio</dt>
                <dd className="font-bold text-ink">
                  {settings?.notice || 'Nenhum aviso publicado.'}
                </dd>
              </div>
            </div>
          </dl>
          <Link
            className="mt-5 flex min-h-11 items-center justify-center rounded-full border border-border text-sm font-bold text-ink"
            href="/admin/loja"
          >
            Editar dados da loja
          </Link>
        </Card>
      </section>

      <section className="mt-4 hidden grid-cols-3 gap-3 lg:grid">
        {quickLinks.map((item) => (
          <Link
            className="flex min-h-[72px] items-center gap-3 rounded-xl border border-border bg-white p-3 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
            href={item.href}
            key={item.href}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach text-brand-strong">
              <AdminIcon name={item.icon} />
            </span>
            <span className="min-w-0">
              <strong className="block font-[family-name:var(--font-poppins)] text-sm text-ink">
                {item.title}
              </strong>
              <span className="text-xs text-muted">{item.detail}</span>
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}

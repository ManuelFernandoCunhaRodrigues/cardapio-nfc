'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AdminIcon, type AdminIconName } from './admin-icon';
import { SignOutButton } from './sign-out-button';
import { StoreStatusControl } from './store-status-control';

const links: Array<{ href: string; label: string; shortLabel: string; icon: AdminIconName }> = [
  { href: '/admin', label: 'Resumo', shortLabel: 'Resumo', icon: 'grid' },
  { href: '/admin/produtos', label: 'Produtos', shortLabel: 'Produtos', icon: 'products' },
  { href: '/admin/categorias', label: 'Categorias', shortLabel: 'Categorias', icon: 'tag' },
  { href: '/admin/destaques', label: 'Destaques', shortLabel: 'Destaques', icon: 'star' },
  { href: '/admin/loja', label: 'Dados da loja', shortLabel: 'Loja', icon: 'store' },
];

function isCurrent(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({
  children,
  storeOpen,
  statusOverride,
}: Readonly<{
  children: React.ReactNode;
  name: string | null;
  storeOpen: boolean | null;
  statusOverride: 'auto' | 'open' | 'closed' | null;
}>) {
  const pathname = usePathname();
  const isProductForm =
    pathname === '/admin/produtos/novo' || /^\/admin\/produtos\/[^/]+$/.test(pathname);
  return (
    <div
      className={`admin-shell min-h-screen bg-cream ${isProductForm ? '' : 'pb-[5.25rem]'} lg:pb-0`}
    >
      <aside className="fixed inset-y-0 z-40 hidden w-[198px] flex-col bg-ink px-4 py-7 text-cream lg:flex">
        <Link className="mx-auto text-center" href="/admin">
          <Image
            alt="Salgaê"
            className="h-auto w-[118px]"
            height={76}
            priority
            src="/brand/salgae-logo-recortada.webp"
            width={150}
          />
          <span className="lbl mt-1 block text-cream/65">Painel</span>
        </Link>
        <nav aria-label="Painel administrativo" className="mt-8 space-y-1">
          {links.map((link) => (
            <Link
              aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 font-[family-name:var(--font-poppins)] text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/30 ${isCurrent(pathname, link.href) ? 'bg-brand-strong text-white' : 'text-cream/85 hover:bg-white/10 hover:text-white'}`}
              href={link.href}
              key={link.href}
            >
              <AdminIcon name={link.icon} />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-white/8 p-3">
          <p className="lbl text-cream/55">Status da loja</p>
          <div className="mt-2">
            <StoreStatusControl compact override={statusOverride} storeOpen={storeOpen} />
          </div>
        </div>
        <div className="mt-2">
          <SignOutButton
            className="w-full justify-start border-transparent px-3 text-cream hover:bg-white/10 hover:text-white"
            icon
          />
        </div>
      </aside>
      <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:ml-[198px] lg:max-w-[calc(100%-198px)] lg:px-8 lg:py-7">
        {!isProductForm ? (
          <header className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center lg:hidden">
            <div className="justify-self-start">
              <StoreStatusControl compact override={statusOverride} storeOpen={storeOpen} />
            </div>
            <Link className="text-center" href="/admin">
              <Image
                alt="Salgaê"
                className="h-[36px] w-auto"
                height={38}
                priority
                src="/brand/salgae-logo-recortada.webp"
                width={76}
              />
              <span className="lbl -mt-0.5 block text-muted">Painel</span>
            </Link>
            <div className="justify-self-end">
              <SignOutButton compact icon />
            </div>
          </header>
        ) : null}
        {children}
      </main>
      {!isProductForm ? (
        <nav
          aria-label="Navegação do painel"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 rounded-t-[1.5rem] border-t border-border bg-white px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-3px_12px_rgba(23,17,13,0.08)] lg:hidden"
        >
          {links.map((link) => (
            <Link
              aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl font-[family-name:var(--font-poppins)] text-[10px] font-medium focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 ${isCurrent(pathname, link.href) ? 'text-brand-strong' : 'text-muted'}`}
              href={link.href}
              key={link.href}
            >
              <span
                className={
                  isCurrent(pathname, link.href) ? 'rounded-full bg-peach px-3 py-1' : 'px-3 py-1'
                }
              >
                <AdminIcon height={19} name={link.icon} width={19} />
              </span>
              {link.shortLabel}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

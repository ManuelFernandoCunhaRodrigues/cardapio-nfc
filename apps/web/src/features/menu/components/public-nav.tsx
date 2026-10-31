'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as m from 'motion/react-m';

import { gentleSpring } from '@/components/motion/motion-primitives';
import { useHydrated } from '@/hooks/use-client-snapshot';

import { Icon, type IconName } from './icons';

const items: {
  href: string;
  label: string;
  icon: IconName;
  matches: (pathname: string) => boolean;
}[] = [
  { href: '/', label: 'Início', icon: 'home', matches: (path) => path === '/' },
  {
    href: '/cardapio',
    label: 'Cardápio',
    icon: 'menu',
    matches: (path) => path === '/cardapio' || path.startsWith('/produto/'),
  },
  { href: '/busca', label: 'Busca', icon: 'search', matches: (path) => path === '/busca' },
  { href: '/info', label: 'Info', icon: 'info', matches: (path) => path === '/info' },
];

export function PublicNav() {
  const pathname = usePathname();
  // Na Vercel a página inicial é gerada com outro caminho e sai sem aba ativa. O React não corrige
  // atributos na hidratação, então a barra é remontada uma vez no navegador com o caminho real.
  const hydrated = useHydrated();
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-30">
      <div
        className="mx-auto grid min-h-[calc(72px+env(safe-area-inset-bottom))] max-w-[480px] grid-cols-4 rounded-t-[24px] bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_16px_rgba(23,17,13,0.08)]"
        key={hydrated ? 'navegador' : 'servidor'}
      >
        {items.map((item) => {
          const active = item.matches(pathname);
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 font-[family-name:var(--font-poppins)] text-[11px] font-medium focus-visible:rounded-xl focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 ${active ? 'text-brand-strong' : 'text-muted'}`}
              href={item.href}
              key={item.href}
            >
              <span
                className={`relative grid h-[30px] w-14 place-items-center rounded-full ${active && !hydrated ? 'bg-peach' : ''}`}
              >
                {hydrated && active ? (
                  <m.span
                    aria-hidden="true"
                    className="absolute h-[30px] w-14 rounded-full bg-peach"
                    layoutId="public-navigation-indicator"
                    transition={gentleSpring}
                  />
                ) : null}
                <span className="relative z-10">
                  <Icon name={item.icon} />
                </span>
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

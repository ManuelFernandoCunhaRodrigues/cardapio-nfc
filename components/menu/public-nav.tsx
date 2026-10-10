'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon, type IconName } from './icons';

const items: { href: string; label: string; icon: IconName; matches: (pathname: string) => boolean }[] = [
  { href: '/', label: 'Início', icon: 'home', matches: (path) => path === '/' },
  { href: '/cardapio', label: 'Cardápio', icon: 'menu', matches: (path) => path === '/cardapio' || path.startsWith('/produto/') },
  { href: '/busca', label: 'Busca', icon: 'search', matches: (path) => path === '/busca' },
  { href: '/info', label: 'Info', icon: 'info', matches: (path) => path === '/info' },
];

export function PublicNav() {
  const pathname = usePathname();
  return <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-white/95 backdrop-blur"><div className="mx-auto grid max-w-[480px] grid-cols-4 pb-[env(safe-area-inset-bottom)]">{items.map((item) => {
    const active = item.matches(pathname);
    return <Link aria-current={active ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 ${active ? 'text-brand-strong' : 'text-muted'}`} href={item.href} key={item.href}><Icon name={item.icon} /><span>{item.label}</span></Link>;
  })}</div></nav>;
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SignOutButton } from './sign-out-button';

const links = [
  { href: '/admin', label: 'Dashboard', icon: '◼' },
  { href: '/admin/produtos', label: 'Produtos', icon: '◫' },
  { href: '/admin/categorias', label: 'Categorias', icon: '◇' },
  { href: '/admin/loja', label: 'Dados da loja', icon: '⌂' },
];

function isCurrent(pathname: string, href: string) { return href === '/admin' ? pathname === href : pathname.startsWith(href); }

export function AdminShell({ children, name, storeOpen }: Readonly<{ children: React.ReactNode; name: string | null; storeOpen: boolean | null }>) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-[linear-gradient(180deg,#F0E9D8_0%,#EDDFC1_100%)] pb-20 lg:pb-0"><aside className="fixed inset-y-0 hidden w-60 flex-col bg-ink p-5 text-cream lg:flex"><Link className="disp text-2xl font-extrabold" href="/admin">Salgaê</Link><p className="mt-1 text-xs text-cream/65">Painel administrativo</p><nav className="mt-10 space-y-2" aria-label="Painel administrativo">{links.map((link) => <Link className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/30 ${isCurrent(pathname, link.href) ? 'bg-brand text-white' : 'text-cream/80 hover:bg-white/10 hover:text-cream'}`} href={link.href} key={link.href}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>)}</nav><div className="mt-auto rounded-card border border-white/10 bg-white/5 p-4"><p className="lbl text-cream/55">Status da loja</p><p className={`mt-2 text-sm font-bold ${storeOpen === null ? 'text-cream' : storeOpen ? 'text-[#FFB391]' : 'text-cream/70'}`}>{storeOpen === null ? 'Indisponível' : storeOpen ? 'Aberta · aceitando' : 'Fechada agora'}</p><div className="mt-4"><SignOutButton /></div></div></aside><main className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 sm:px-6 lg:ml-60 lg:px-10 lg:py-9"><header className="mb-7 flex items-center justify-between lg:hidden"><div><p className="lbl text-positive">Administração</p><p className="disp mt-1 text-xl font-extrabold text-ink">Olá, {name ?? 'Salgaê'} 👋</p></div><SignOutButton /></header>{children}</main><nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-cream px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-2px_8px_rgba(23,17,13,0.08)] lg:hidden" aria-label="Navegação do painel">{links.map((link) => <Link aria-current={isCurrent(pathname, link.href) ? 'page' : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 ${isCurrent(pathname, link.href) ? 'text-brand' : 'text-muted'}`} href={link.href} key={link.href}><span aria-hidden="true" className="text-base">{link.icon}</span>{link.label === 'Dados da loja' ? 'Loja' : link.label}</Link>)}</nav></div>;
}

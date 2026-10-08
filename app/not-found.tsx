import Link from 'next/link';

import { Card } from '@/components/ui/card';

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center px-4"><Card className="max-w-md"><h1 className="disp text-2xl font-bold text-ink">Página não encontrada</h1><p className="mt-2 text-sm leading-6 text-muted">Confira o endereço ou volte para o cardápio.</p><Link className="mt-6 inline-flex rounded-full bg-brand px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20" href="/">Ver cardápio</Link></Card></main>;
}

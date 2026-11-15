import Link from 'next/link';

import { BrandLogo } from '@/components/brand/brand-logo';
import { PublicShell } from '@/features/menu/components/public-shell';

// Fica dentro da moldura do site público: quem abre um link antigo de produto vê a logo, a barra
// inferior e um caminho direto para o cardápio.
export default function NotFound() {
  return (
    <PublicShell>
      <header className="grid h-[68px] place-items-center px-4">
        <Link className="rounded-lg" href="/">
          <span className="sr-only">Página inicial da</span>
          <BrandLogo className="h-11 w-auto" width={79} />
        </Link>
      </header>
      <main className="px-4 pb-6 pt-6">
        <section className="rounded-card bg-white px-6 py-8 text-center shadow-card">
          <h1 className="disp text-2xl font-bold text-ink">Página não encontrada</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Este item pode ter saído do cardápio, ou o endereço mudou. Veja o que temos hoje.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand-strong px-5 font-[family-name:var(--font-poppins)] text-sm font-semibold text-white shadow-brand"
            href="/cardapio"
          >
            Ver cardápio
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}

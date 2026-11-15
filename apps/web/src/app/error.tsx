'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// `public-shell` aplica o contorno de foco forte do site público, também fora do layout público.
export default function GlobalError({ retry }: Readonly<{ error: unknown; retry: () => void }>) {
  return (
    <main className="public-shell grid min-h-screen place-items-center px-4">
      <Card className="max-w-md">
        <h1 className="disp text-2xl font-bold text-ink">Algo não saiu como esperado</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Tente novamente. Se o problema continuar, fale com a equipe no balcão.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {/* `retry` busca os dados de novo; `reset` só redesenharia o que falhou. */}
          <Button onClick={() => retry()}>Tentar novamente</Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-bold text-ink hover:bg-surface-inner"
            href="/cardapio"
          >
            Ver cardápio
          </Link>
        </div>
      </Card>
    </main>
  );
}

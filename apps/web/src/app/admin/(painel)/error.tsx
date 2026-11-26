'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Fica dentro do layout do painel, então o menu continua na tela e o dono pode seguir para outra
 * parte. `retry` busca os dados de novo no servidor antes de redesenhar a tela.
 */
export default function AdminPanelError({
  retry,
}: Readonly<{ error: unknown; retry: () => void }>) {
  return (
    <Card className="mx-auto mt-6 max-w-md" role="alert">
      <h1 className="disp text-2xl font-bold text-ink">Não deu para abrir esta tela</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Pode ter sido uma falha rápida na conexão. Tente de novo; se continuar, volte ao Resumo e
        tente daqui a pouco.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Tentar de novo</Button>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-surface-inner focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
          href="/admin"
        >
          Voltar ao Resumo
        </Link>
      </div>
    </Card>
  );
}

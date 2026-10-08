'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function GlobalError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="max-w-md"><h1 className="disp text-2xl font-bold text-ink">Algo não saiu como esperado</h1><p className="mt-2 text-sm leading-6 text-muted">Tente novamente. Se o problema continuar, fale com a equipe da Salgaê.</p><Button className="mt-6" onClick={reset}>Tentar novamente</Button></Card>
    </main>
  );
}

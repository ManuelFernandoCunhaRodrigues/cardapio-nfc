import Link from 'next/link';

import { Card } from '@/components/ui/card';

/** Aparece dentro do painel, com o menu, quando um produto aberto por link já foi excluído. */
export default function AdminPanelNotFound() {
  return (
    <Card className="mx-auto mt-6 max-w-md">
      <h1 className="disp text-2xl font-bold text-ink">Este item não existe mais</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Ele pode ter sido excluído. Volte para a lista de produtos para ver o que está cadastrado.
      </p>
      <Link
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-strong px-5 py-3 text-sm font-bold text-white shadow-brand transition-colors hover:bg-[#A8441B] focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
        href="/admin/produtos"
      >
        Voltar para Produtos
      </Link>
    </Card>
  );
}

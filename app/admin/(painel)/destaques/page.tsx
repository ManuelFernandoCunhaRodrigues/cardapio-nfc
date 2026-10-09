import { HighlightsManager } from '@/components/admin/highlights-manager';
import { getAdminHighlights } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function HighlightsPage() {
  const highlights = await getAdminHighlights();
  return <><header className="hidden border-b border-border pb-6 lg:block"><p className="lbl text-positive">Conteúdo</p><h1 className="disp mt-2 text-3xl font-extrabold text-ink">Destaques</h1><p className="mt-2 text-sm text-muted">Crie banners, escolha o destino e ordene o que aparece na página inicial.</p></header><div className="lg:mt-7"><HighlightsManager highlights={highlights} /></div></>;
}

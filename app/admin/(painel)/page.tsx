import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [active, unavailable, withoutImage, categories] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_available', false),
    supabase.from('products').select('*', { count: 'exact', head: true }).is('image_path', null),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
  ]);
  const cards = [
    { label: 'Produtos ativos', value: active.count ?? 0, detail: 'Aparecem quando a categoria está ativa.' },
    { label: 'Indisponíveis', value: unavailable.count ?? 0, detail: 'Continuam visíveis com aviso no cardápio.' },
    { label: 'Sem foto', value: withoutImage.count ?? 0, detail: 'Usam o fallback até receber mídia.' },
    { label: 'Categorias', value: categories.count ?? 0, detail: 'Organizam a navegação do cardápio.' },
  ];
  return <><header className="hidden border-b border-border pb-6 lg:block"><p className="lbl text-positive">Administração</p><h1 className="disp mt-2 text-3xl font-extrabold text-ink">Visão do catálogo</h1><p className="mt-2 text-sm text-muted">Mantenha o cardápio claro e atualizado para quem está no balcão.</p></header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.label}><p className="lbl text-muted">{card.label}</p><p className="disp mt-3 text-4xl font-extrabold text-ink">{card.value}</p><p className="mt-2 text-xs leading-5 text-muted">{card.detail}</p></Card>)}</section><section className="mt-6 grid gap-4 md:grid-cols-2"><Card><h2 className="disp text-xl font-bold text-ink">Atualizar o cardápio</h2><p className="mt-2 text-sm leading-6 text-muted">Cadastre um item ou ajuste preço, disponibilidade e ordem sem mexer no código.</p><Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-brand focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/admin/produtos/novo">Novo produto</Link></Card><Card><h2 className="disp text-xl font-bold text-ink">Organizar categorias</h2><p className="mt-2 text-sm leading-6 text-muted">Crie categorias, ajuste a ordem e só exclua quando não houver produtos vinculados.</p><Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-bold text-ink focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/admin/categorias">Nova categoria</Link></Card></section></>;
}

import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/admin/sign-out-button';
import { StoreSettingsForm } from '@/components/admin/store-settings-form';
import { Card } from '@/components/ui/card';
import { getStoreSettings } from '@/lib/store/get-store-settings';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function StoreSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: profile } = await supabase.from('profiles').select('role, is_active, name').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin' && profile.is_active;
  if (!isAdmin) return <main className="grid min-h-screen place-items-center px-4 py-10"><Card className="w-full max-w-md"><h1 className="disp text-2xl font-extrabold text-ink">Acesso não autorizado</h1><p className="mt-2 text-sm leading-6 text-muted">Sua conta não possui permissão ativa para acessar o painel administrativo.</p><div className="mt-6"><SignOutButton /></div></Card></main>;

  const settings = await getStoreSettings();
  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6"><div><p className="lbl text-positive">Administração</p><h1 className="disp mt-2 text-3xl font-extrabold text-ink">Dados da loja</h1><p className="mt-2 text-sm text-muted">Atualize as informações exibidas na aba Info do cardápio.</p></div><SignOutButton /></header>{!settings ? <p className="mt-6 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-body" role="status">Não foi possível carregar os dados salvos. Você pode preencher o formulário e tentar salvar.</p> : null}<div className="mt-8"><StoreSettingsForm settings={settings} /></div></main>;
}

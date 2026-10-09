import { StoreSettingsForm } from '@/components/admin/store-settings-form';
import { getStoreSettings } from '@/lib/store/get-store-settings';

export const dynamic = 'force-dynamic';

export default async function StoreSettingsPage() {
  const settings = await getStoreSettings();
  return <><header className="hidden border-b border-border pb-6 lg:block"><p className="lbl text-positive">Administração</p><h1 className="disp mt-2 text-3xl font-extrabold text-ink">Dados da loja</h1><p className="mt-2 text-sm text-muted">Atualize as informações exibidas na aba Info do cardápio.</p></header>{!settings ? <p className="mt-6 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-body" role="status">Não foi possível carregar os dados salvos. Você pode preencher o formulário e tentar salvar.</p> : null}<div className="mt-7"><StoreSettingsForm settings={settings} /></div></>;
}

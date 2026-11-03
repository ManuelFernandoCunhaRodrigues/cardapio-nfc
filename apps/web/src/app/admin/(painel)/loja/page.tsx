import { AdminNotice } from '@/features/admin/components/admin-notice';
import { StoreSettingsForm } from '@/features/store/components/store-settings-form';
import { getAdminStoreSettings } from '@/features/store/server/get-store-settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function StoreSettingsPage() {
  const store = await getAdminStoreSettings();
  return (
    <>
      <header className="mb-5">
        <h1 className="disp text-2xl font-bold text-ink lg:text-[28px]">Dados da loja</h1>
        <p className="mt-1 text-sm text-muted">
          Atualize informações, aviso e horários do cardápio.
        </p>
      </header>
      {store.status === 'loaded' ? (
        <StoreSettingsForm settings={store.settings} />
      ) : (
        <AdminNotice
          kind="error"
          message="Não foi possível carregar os dados salvos da loja. Atualize a página para tentar de novo."
        />
      )}
    </>
  );
}

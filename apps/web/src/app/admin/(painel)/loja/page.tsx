import { AdminNotice } from '@/features/admin/components/admin-notice';
import { StoreSettingsForm } from '@/features/store/components/store-settings-form';
import { getStoreSettings } from '@/features/store/server/get-store-settings';

export const dynamic = 'force-dynamic';

export default async function StoreSettingsPage() {
  const settings = await getStoreSettings();
  return (
    <>
      <header className="mb-5">
        <h1 className="disp text-2xl font-bold text-ink lg:text-[28px]">Dados da loja</h1>
        <p className="mt-1 text-sm text-muted">
          Atualize informações, aviso e horários do cardápio.
        </p>
      </header>
      {!settings ? (
        <AdminNotice
          className="mb-4"
          kind="error"
          message="Não foi possível carregar os dados salvos. Preencha o formulário e tente salvar."
        />
      ) : null}
      <StoreSettingsForm settings={settings} />
    </>
  );
}

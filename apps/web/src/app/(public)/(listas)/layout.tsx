import { PublicHeader } from '@/features/menu/components/public-header';
import { getPublicStore } from '@/lib/api/public-api-client';
import { selectPublicStoreStatusSettings } from '@/features/store/rules/client-status';

export default async function PublicListsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicStore();
  const initialNow = new Date().toISOString();
  const publicSettings = selectPublicStoreStatusSettings(settings);
  return (
    <>
      <PublicHeader
        initialNow={initialNow}
        settings={publicSettings}
        storeName={settings.name}
        tagline={settings.tagline}
      />
      {children}
    </>
  );
}

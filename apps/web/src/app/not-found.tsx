import { PublicNotFound } from '@/features/menu/components/public-not-found';
import { PublicShell } from '@/features/menu/components/public-shell';

// Endereço que não existe: fica só sob o layout raiz, então a moldura do site público vem daqui.
export default function NotFound() {
  return (
    <PublicShell>
      <PublicNotFound />
    </PublicShell>
  );
}

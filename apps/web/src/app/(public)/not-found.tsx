import { PublicNotFound } from '@/features/menu/components/public-not-found';

// notFound() de uma página pública (produto que saiu do cardápio): a moldura já vem do layout
// público, então aqui vai só o conteúdo, sem uma segunda barra inferior.
export default function PublicNotFoundPage() {
  return <PublicNotFound />;
}

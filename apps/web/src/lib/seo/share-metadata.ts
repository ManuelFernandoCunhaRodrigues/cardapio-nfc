import type { Metadata } from 'next';

const DEFAULT_SHARE_IMAGE = { url: '/brand/compartilhar.jpg', width: 1200, height: 630 };

type ShareMetadataInput = {
  title: string;
  description: string;
  siteName: string;
  /** Sem endereço, não define canonical: serve de padrão para as rotas filhas. */
  path?: string;
  image?: string | null;
};

/** Título, descrição e prévia de compartilhamento (WhatsApp, redes) no mesmo formato em todo o site. */
export function buildShareMetadata({
  title,
  description,
  siteName,
  path,
  image,
}: ShareMetadataInput): Metadata {
  const images = image ? [{ url: image }] : [{ ...DEFAULT_SHARE_IMAGE, alt: siteName }];
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      title,
      description,
      ...(path ? { url: path } : {}),
      type: 'website',
      locale: 'pt_BR',
      siteName,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map(({ url }) => url),
    },
  };
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Salgaê Lanchonete',
    short_name: 'Salgaê',
    start_url: '/',
    display: 'browser',
    background_color: '#F0E9D8',
    theme_color: '#E65F2A',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}

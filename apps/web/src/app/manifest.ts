import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Salgaê Lanchonete',
    short_name: 'Salgaê',
    description: 'Cardápio digital com fotos e preços: salgados, combos e bebidas.',
    lang: 'pt-BR',
    start_url: '/',
    // "Adicionar à tela inicial" abre como app, sem a barra do navegador.
    display: 'standalone',
    background_color: '#F0E9D8',
    theme_color: '#E65F2A',
    // Sem `purpose: 'maskable'`: o ícone atual tem fundo transparente, que sairia escuro no recorte
    // do Android. Fica para quando houver uma arte própria, com fundo cheio e margem de segurança.
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}

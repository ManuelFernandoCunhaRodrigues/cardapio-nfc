import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A foto chega previamente reduzida pelo navegador, mas o limite ainda
      // comporta a validação do arquivo de até 15 MB definida para o servidor.
      bodySizeLimit: '16mb',
    },
  },
};

export default nextConfig;

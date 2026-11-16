import path from 'node:path';

import type { NextConfig } from 'next';

import { buildContentSecurityPolicy } from './src/lib/security/csp';

// Raiz do monorepo: as dependências ficam no `node_modules` de lá (npm workspaces).
const monorepoRoot = path.resolve(__dirname, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@salgae/api', '@salgae/core'],
  turbopack: { root: monorepoRoot },
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ['ffmpeg-static'],
  outputFileTracingIncludes: {
    // A API embutida processa o vídeo dentro desta função do Next.
    '/admin/midia/video': ['../../node_modules/ffmpeg-static/ffmpeg*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy({
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
              development: process.env.NODE_ENV === 'development',
            }),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Reserva a mesma margem abaixo do limite de 4,5 MB da função que recebe a foto na API.
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;

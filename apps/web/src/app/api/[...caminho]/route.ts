import { handleApiRoute } from '@/lib/api/embedded-api';

export const runtime = 'nodejs';
export const maxDuration = 30;

const VIDEO_PROCESSING_PATH = /^\/api\/v1\/admin\/products\/[^/]+\/video\/?$/;

export function POST(request: Request): Response | Promise<Response> {
  if (VIDEO_PROCESSING_PATH.test(new URL(request.url).pathname)) {
    return Response.json(
      {
        status: 'error',
        message:
          'O processamento de vídeo exige a rota dedicada do painel e não está disponível por este endereço.',
      },
      { status: 501 },
    );
  }
  return handleApiRoute(request);
}

export const GET = handleApiRoute;
export const HEAD = handleApiRoute;
export const PUT = handleApiRoute;
export const PATCH = handleApiRoute;
export const DELETE = handleApiRoute;
export const OPTIONS = handleApiRoute;

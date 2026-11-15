import { ffmpegBinaryPath } from '@salgae/api/modules/media/video/ffmpeg-asset';
import { adminApiPaths } from '@salgae/core/contracts/admin-api';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { adminApi } from '@/lib/api/admin-api-client';
import { ApiRequestError } from '@/lib/api/api-request-error';
import { revalidateMenuCache } from '@/lib/cache/revalidate-public-cache';
import { reportServerError } from '@/lib/observability';

export const runtime = 'nodejs';
export const maxDuration = 180;

// Mantém o binário somente no trace desta função longa do Next.
if (ffmpegBinaryPath) process.env.FFMPEG_PATH ??= ffmpegBinaryPath;

const bodySchema = z.object({ productId: z.string().uuid(), path: z.string().min(1) });

function jsonError(message: string, status: number): Response {
  return Response.json({ status: 'error', message }, { status });
}

function validSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const requestHost = forwardedHost || request.headers.get('host') || new URL(request.url).host;
    if (originHost !== requestHost) return false;
  } catch {
    return false;
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  return !fetchSite || fetchSite === 'same-origin';
}

async function readBody(request: Request) {
  try {
    return bodySchema.safeParse(await request.json());
  } catch {
    return bodySchema.safeParse(null);
  }
}

function refreshProduct(productId: string): void {
  revalidateMenuCache(productId);
  revalidatePath('/admin');
  revalidatePath('/admin/produtos');
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function POST(request: Request): Promise<Response> {
  if (!validSameOrigin(request)) return jsonError('Requisição não permitida.', 403);
  const parsed = await readBody(request);
  if (!parsed.success) return jsonError('Dados do vídeo inválidos.', 400);
  const { productId, path } = parsed.data;
  try {
    const result = await adminApi().processVideo(adminApiPaths.productVideo(productId), path);
    refreshProduct(productId);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ApiRequestError) return jsonError(error.message, error.status);
    reportServerError('media_video_proxy_failed', error);
    return jsonError('Não foi possível processar o vídeo agora. Tente novamente.', 500);
  }
}

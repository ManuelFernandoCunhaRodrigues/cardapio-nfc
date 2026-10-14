import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getAdminAuthorization } from '@/lib/admin/require-admin';
import {
  compressVideoFile,
  removeCompressedVideo,
  VIDEO_DOWNLOAD_TIMEOUT_MS,
  VIDEO_FINALIZATION_RESERVE_MS,
  VIDEO_PROCESSING_TIMEOUT_MS,
  VIDEO_RAW_MAX_BYTES,
  VIDEO_ROUTE_BUDGET_MS,
  VIDEO_UPLOAD_TIMEOUT_MS,
  VideoCompressionError,
  type CompressedVideo,
} from '@/lib/media/video';
import { commitStagedMedia } from '@/lib/media/workflow';
import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 180;

const idSchema = z.string().uuid();
const bodySchema = z.object({
  productId: idSchema,
  path: z
    .string()
    .regex(
      /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp4|mov|m4v|webm)$/i,
    ),
});

type RoutePayload = {
  status: 'success' | 'error';
  message: string;
  path?: string;
  originalBytes?: number;
  compressedBytes?: number;
};

function json(payload: RoutePayload, status = 200) {
  return Response.json(payload, { status });
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

function refreshProduct(productId: string) {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/produtos');
  revalidatePath(`/admin/produtos/${productId}`);
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
}

function compressionError(error: unknown): Response {
  if (error instanceof VideoCompressionError) {
    if (error.code === 'video_timeout')
      return json(
        { status: 'error', message: 'A compactação demorou mais que o esperado. Tente novamente.' },
        504,
      );
    if (error.code === 'video_invalid')
      return json(
        { status: 'error', message: 'Este arquivo não é um vídeo válido. Escolha outro vídeo.' },
        400,
      );
    if (error.code === 'video_too_long')
      return json({ status: 'error', message: 'O vídeo deve ter no máximo 15 segundos.' }, 400);
    if (error.code === 'video_too_large')
      return json(
        {
          status: 'error',
          message: 'O vídeo deve ter no máximo 50 MB. Grave em Full HD (1080p), não em 4K.',
        },
        400,
      );
    if (error.code === 'video_dimensions_unsupported')
      return json(
        { status: 'error', message: 'Grave o vídeo em Full HD (1080p), não em 4K.' },
        400,
      );
  }
  return json(
    {
      status: 'error',
      message:
        'Não foi possível compactar este vídeo. Tente um vídeo mais curto ou gravado em Full HD.',
    },
    500,
  );
}

function remainingTime(deadline: number): number {
  return Math.max(0, deadline - Date.now());
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0) return Promise.reject(new VideoCompressionError('video_timeout'));
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new VideoCompressionError('video_timeout')), timeoutMs);
    void Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  const deadline = Date.now() + VIDEO_ROUTE_BUDGET_MS;
  if (!validSameOrigin(request))
    return json({ status: 'error', message: 'Requisição não permitida.' }, 403);

  const authorization = await getAdminAuthorization();
  if (authorization.status === 'unauthenticated')
    return json({ status: 'error', message: 'Sua sessão expirou. Entre novamente.' }, 401);
  if (authorization.status !== 'authorized')
    return json({ status: 'error', message: 'Você não tem permissão para esta alteração.' }, 403);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ status: 'error', message: 'Dados do vídeo inválidos.' }, 400);
  }
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success || !parsed.data.path.startsWith(`uploads/${parsed.data.productId}_`)) {
    return json({ status: 'error', message: 'Dados do vídeo inválidos.' }, 400);
  }

  const { productId, path: rawPath } = parsed.data;
  const supabase = await createClient();
  let routeDir: string | undefined;
  let compressed: CompressedVideo | undefined;
  let stagedOutputPath: string | undefined;
  let outputLinked = false;
  try {
    const { data: cover, error: coverError } = await supabase
      .from('products')
      .select('image_path')
      .eq('id', productId)
      .single();
    if (coverError || !cover?.image_path)
      return json(
        { status: 'error', message: 'Salve uma foto de capa antes de enviar o vídeo.' },
        400,
      );

    const { data: raw, error: downloadError } = await withTimeout(
      supabase.storage.from('product-video-uploads').download(rawPath),
      Math.min(VIDEO_DOWNLOAD_TIMEOUT_MS, remainingTime(deadline)),
    );
    if (downloadError || !raw)
      return json(
        { status: 'error', message: 'O envio do vídeo não foi concluído. Tente novamente.' },
        400,
      );
    if (raw.size <= 0 || raw.size > VIDEO_RAW_MAX_BYTES) {
      return raw.size > VIDEO_RAW_MAX_BYTES
        ? compressionError(new VideoCompressionError('video_too_large'))
        : compressionError(new VideoCompressionError('video_invalid'));
    }

    routeDir = await mkdtemp(join(tmpdir(), 'salgae-route-video-'));
    const inputPath = join(routeDir, `original.${rawPath.split('.').at(-1) ?? 'bin'}`);
    await writeFile(inputPath, Buffer.from(await raw.arrayBuffer()));
    const processingTimeoutMs = Math.min(
      VIDEO_PROCESSING_TIMEOUT_MS,
      remainingTime(deadline) - VIDEO_FINALIZATION_RESERVE_MS,
    );
    if (processingTimeoutMs <= 0) throw new VideoCompressionError('video_timeout');
    compressed = await compressVideoFile({
      inputPath,
      workDir: routeDir,
      timeoutMs: processingTimeoutMs,
    });

    const outputPath = `products/${productId}/${randomUUID()}.mp4`;
    stagedOutputPath = outputPath;
    const output = await readFile(compressed.outputPath);
    const { error: uploadError } = await withTimeout(
      supabase.storage.from('product-videos').upload(outputPath, output, {
        contentType: 'video/mp4',
        cacheControl: '31536000',
        upsert: false,
      }),
      Math.min(VIDEO_UPLOAD_TIMEOUT_MS, remainingTime(deadline)),
    );
    if (uploadError) {
      reportServerError('media_video_output_upload_failed', uploadError);
      return json(
        {
          status: 'error',
          message: 'Não foi possível salvar o vídeo compactado. Tente novamente.',
        },
        500,
      );
    }

    const { data: current, error: currentError } = await supabase
      .from('products')
      .select('video_path')
      .eq('id', productId)
      .single();
    if (currentError || !current) {
      await supabase.storage.from('product-videos').remove([outputPath]);
      return json(
        {
          status: 'error',
          message:
            'O vídeo foi compactado, mas não pôde ser vinculado ao produto. Tente novamente.',
        },
        500,
      );
    }

    try {
      await commitStagedMedia({
        commit: async () => {
          const { data: updated, error } = await supabase
            .from('products')
            .update({ video_path: outputPath })
            .eq('id', productId)
            .select('id');
          if (error || updated?.length !== 1)
            throw error ?? new Error('media_video_product_not_updated');
          outputLinked = true;
        },
        rollbackStaged: async () => {
          const { error } = await supabase.storage.from('product-videos').remove([outputPath]);
          if (error) reportServerError('media_unlinked_video_cleanup_failed', error);
        },
        cleanupPrevious: async () => {
          try {
            if (!current.video_path || current.video_path === outputPath) return;
            const { data: references, error: referenceError } = await supabase
              .from('products')
              .select('id')
              .eq('video_path', current.video_path)
              .limit(1);
            if (referenceError || references === null) {
              reportServerError('media_old_video_reference_check_failed', referenceError);
              return;
            }
            if (references.length === 0) {
              const { error } = await supabase.storage
                .from('product-videos')
                .remove([current.video_path]);
              if (error) reportServerError('media_old_video_cleanup_failed', error);
            }
          } catch (error) {
            reportServerError('media_old_video_cleanup_failed', error);
          }
        },
      });
    } catch (error) {
      reportServerError('media_video_record_update_failed', error);
      return json(
        {
          status: 'error',
          message:
            'O vídeo foi compactado, mas não pôde ser vinculado ao produto. Tente novamente.',
        },
        500,
      );
    }

    refreshProduct(productId);
    return json({
      status: 'success',
      message: `Vídeo compactado e salvo: ${formatMegabytes(compressed.inputBytes)} MB → ${formatMegabytes(compressed.outputBytes)} MB.`,
      path: outputPath,
      originalBytes: compressed.inputBytes,
      compressedBytes: compressed.outputBytes,
    });
  } catch (error) {
    reportServerError(
      'media_video_compression_failed',
      error instanceof VideoCompressionError
        ? { code: error.code, detail: error.message }
        : { code: 'unexpected', detail: 'Erro inesperado.' },
    );
    return compressionError(error);
  } finally {
    if (stagedOutputPath && !outputLinked) {
      const { error } = await supabase.storage.from('product-videos').remove([stagedOutputPath]);
      if (error) reportServerError('media_unlinked_video_cleanup_failed', error);
    }
    const { error } = await supabase.storage.from('product-video-uploads').remove([rawPath]);
    if (error) reportServerError('media_video_raw_cleanup_failed', error);
    if (compressed) await removeCompressedVideo(compressed);
    if (routeDir) await rm(routeDir, { recursive: true, force: true });
  }
}

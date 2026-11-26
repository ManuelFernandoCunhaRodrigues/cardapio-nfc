import type { Context } from 'hono';
import { z } from 'zod';

import { ValidationError } from '../../../shared/errors/domain-errors';
import { readUuidParam, requestSignal } from '../../../shared/http/index';
import { serviceForRequest, type ServiceFactory } from '../../../shared/supabase/request-service';
import type { AppHonoEnv } from '../../../shared/types';
import type { VideoService } from './video.service';

type VideoContext = Context<AppHonoEnv>;

const uploadSchema = z.object({ mimeType: z.string(), size: z.number() });
const processSchema = z.object({ path: z.string() });

async function readBody<T>(context: VideoContext, schema: z.ZodType<T>): Promise<T> {
  try {
    const parsed = schema.safeParse(await context.req.json());
    if (parsed.success) return parsed.data;
  } catch {}
  throw new ValidationError('Dados do vídeo inválidos.');
}

export function createVideoController(createService: ServiceFactory<VideoService>) {
  const service = (context: VideoContext) => serviceForRequest(context, createService);
  const productId = (context: VideoContext) => readUuidParam(context, 'id', 'Produto inválido.');
  return {
    prepareUpload: async (context: VideoContext) => {
      const id = productId(context);
      const { mimeType, size } = await readBody(context, uploadSchema);
      return context.json(await service(context).prepareUpload(id, mimeType, size), 201);
    },
    process: async (context: VideoContext) => {
      const id = productId(context);
      const { path } = await readBody(context, processSchema);
      const result = await service(context).process(id, path, requestSignal(context));
      return context.json({ status: 'success' as const, ...result });
    },
    remove: async (context: VideoContext) => {
      await service(context).remove(productId(context), requestSignal(context));
      return context.body(null, 204);
    },
  };
}

import type { Context } from 'hono';

import { ValidationError } from '../../../shared/errors/domain-errors.js';
import { readUuidParam } from '../../../shared/http/index.js';
import {
  serviceForRequest,
  type ServiceFactory,
} from '../../../shared/supabase/request-service.js';
import type { AppHonoEnv } from '../../../shared/types.js';
import type { ImageService, ImageTarget } from './image.service.js';

type ImageContext = Context<AppHonoEnv>;

async function readImage(context: ImageContext): Promise<File> {
  let body: FormData;
  try {
    body = await context.req.formData();
  } catch {
    throw new ValidationError('Envie a foto no campo image.');
  }
  const file = body.get('image');
  if (!(file instanceof File) || !file.size)
    throw new ValidationError('Escolha uma foto antes de enviar.');
  if (!file.type.startsWith('image/')) {
    throw new ValidationError('Este arquivo não é uma imagem válida. Escolha outra foto.');
  }
  return file;
}

export function createImageController(
  target: ImageTarget,
  createService: ServiceFactory<ImageService>,
) {
  const service = (context: ImageContext) => serviceForRequest(context, createService);
  const invalidId = target === 'product' ? 'Produto inválido.' : 'Destaque inválido.';
  return {
    upload: async (context: ImageContext) => {
      const id = readUuidParam(context, 'id', invalidId);
      const path = await service(context).upload(target, id, await readImage(context));
      return context.json({ path }, 201);
    },
    remove: async (context: ImageContext) => {
      const id = readUuidParam(context, 'id', invalidId);
      await service(context).remove(target, id);
      return context.body(null, 204);
    },
  };
}

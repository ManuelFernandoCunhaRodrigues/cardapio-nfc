import type { Context } from 'hono';

import { ValidationError } from '../../../shared/errors/domain-errors';
import { readUuidParam, requestSignal } from '../../../shared/http/index';
import { serviceForRequest, type ServiceFactory } from '../../../shared/supabase/request-service';
import type { AppHonoEnv } from '../../../shared/types';
import type { ImageService, ImageTarget } from './image.service';

type ImageContext = Context<AppHonoEnv>;

const invalidIdMessages: Record<ImageTarget, string> = {
  product: 'Produto inválido.',
  highlight: 'Destaque inválido.',
  category: 'Categoria inválida.',
};

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
  const invalidId = invalidIdMessages[target];
  return {
    upload: async (context: ImageContext) => {
      const id = readUuidParam(context, 'id', invalidId);
      const file = await readImage(context);
      const path = await service(context).upload(target, id, file, requestSignal(context));
      return context.json({ path }, 201);
    },
    remove: async (context: ImageContext) => {
      const id = readUuidParam(context, 'id', invalidId);
      await service(context).remove(target, id, requestSignal(context));
      return context.body(null, 204);
    },
  };
}

import { bodyLimit } from 'hono/body-limit';

import { IMAGE_BODY_MAX_BYTES } from './image-compressor.js';

export const imageBodyLimit = bodyLimit({
  maxSize: IMAGE_BODY_MAX_BYTES,
  onError: (context) =>
    context.json(
      { status: 'error' as const, message: 'A foto reduzida deve ter menos de 4 MB.' },
      413,
    ),
});

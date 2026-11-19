import { bodyLimit } from 'hono/body-limit';

import { errorResponse } from '../../../shared/http';
import { IMAGE_BODY_MAX_BYTES } from './image-compressor';

export const imageBodyLimit = bodyLimit({
  maxSize: IMAGE_BODY_MAX_BYTES,
  onError: (context) => errorResponse(context, 413, 'A foto reduzida deve ter menos de 4 MB.'),
});

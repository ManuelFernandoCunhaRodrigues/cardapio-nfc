import type { Context } from 'hono';

import type { AppHonoEnv } from '../../shared/types.js';
import type { StoreService } from './store.service.js';

export function createStoreController(service: StoreService) {
  return (context: Context<AppHonoEnv>) =>
    service.getPublicSettings().then((settings) => context.json(settings));
}

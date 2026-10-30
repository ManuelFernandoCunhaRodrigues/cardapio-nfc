import { Hono } from 'hono';

import type { AppHonoEnv } from '../../shared/types.js';
import type { createStoreController } from './store.controller.js';

type StoreController = ReturnType<typeof createStoreController>;

export function createStoreRoutes(controller: StoreController) {
  return new Hono<AppHonoEnv>().get('/store', controller);
}

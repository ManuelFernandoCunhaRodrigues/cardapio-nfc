import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../shared/http/error-handler.js';
import type { AppHonoEnv } from '../../shared/types.js';
import { createStoreController } from './store.controller.js';
import { createStoreRoutes } from './store.routes.js';
import { StoreService } from './store.service.js';
import { storeSettingsFixture } from './store.test-fixture.js';

function testApp(settings: unknown) {
  const app = new Hono<AppHonoEnv>();
  app.onError(errorHandler);
  const service = new StoreService({ findPublicSettings: async () => settings });
  app.route('/v1', createStoreRoutes(createStoreController(service)));
  return app;
}

describe('public store route', () => {
  it('GET /v1/store returns public settings', async () => {
    const response = await testApp(storeSettingsFixture).request('/v1/store');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(storeSettingsFixture);
  });

  it('GET /v1/store returns 404 when the singleton row is absent', async () => {
    const response = await testApp(null).request('/v1/store');

    expect(response.status).toBe(404);
  });
});

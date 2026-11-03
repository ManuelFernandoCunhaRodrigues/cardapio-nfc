import { storeStatusInputSchema } from '@salgae/core/contracts/admin-api';
import { storeSettingsFormSchema } from '@salgae/core/schemas/store-settings';
import type { Context } from 'hono';

import { readJsonBody } from '../../shared/http/index';
import { serviceForRequest, type ServiceFactory } from '../../shared/supabase/request-service';
import type { AppHonoEnv } from '../../shared/types';
import type { StoreService } from './store.service';

type StoreContext = Context<AppHonoEnv>;

export function createPublicStoreController(service: StoreService) {
  return {
    getSettings: async (context: StoreContext) => context.json(await service.getSettings()),
  };
}

export function createAdminStoreController(createService: ServiceFactory<StoreService>) {
  const service = (context: StoreContext) => serviceForRequest(context, createService);
  return {
    getSettings: async (context: StoreContext) =>
      context.json(await service(context).getSettings()),
    updateSettings: async (context: StoreContext) => {
      const input = await readJsonBody(context, storeSettingsFormSchema);
      await service(context).updateSettings(input);
      return context.body(null, 204);
    },
    updateStatusOverride: async (context: StoreContext) => {
      const input = await readJsonBody(context, storeStatusInputSchema);
      await service(context).updateStatusOverride(input);
      return context.body(null, 204);
    },
  };
}

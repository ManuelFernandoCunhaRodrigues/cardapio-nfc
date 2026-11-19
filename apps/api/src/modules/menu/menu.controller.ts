import type { Context } from 'hono';

import { readSlugOrIdParam } from '../../shared/http';
import type { AppHonoEnv } from '../../shared/types';
import type { MenuService } from './menu.service';

export function createMenuController(service: MenuService) {
  return {
    listMenu: async (context: Context<AppHonoEnv>) => context.json(await service.listMenu()),
    getProduct: async (context: Context<AppHonoEnv>) => {
      const slugOrId = readSlugOrIdParam(context, 'Produto não encontrado.');
      return context.json(await service.getProduct(slugOrId));
    },
    listSitemap: async (context: Context<AppHonoEnv>) =>
      context.json(await service.listSitemapItems()),
  };
}

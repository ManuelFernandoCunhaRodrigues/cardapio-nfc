import type { Context } from 'hono';

import type { AppHonoEnv } from '../../shared/types.js';
import type { MenuService } from './menu.service.js';

export function createMenuController(service: MenuService) {
  return {
    listMenu: (context: Context<AppHonoEnv>) =>
      service.listMenu().then((menu) => context.json(menu)),
    getProduct: (context: Context<AppHonoEnv>) =>
      service.getProduct(context.req.param('slugOrId')!).then((product) => context.json(product)),
    listSitemap: (context: Context<AppHonoEnv>) =>
      service.listSitemapItems().then((items) => context.json(items)),
  };
}

import { Hono } from 'hono';

import type { AppHonoEnv } from '../../shared/types.js';
import type { createMenuController } from './menu.controller.js';

type MenuController = ReturnType<typeof createMenuController>;

export function createMenuRoutes(controller: MenuController) {
  return new Hono<AppHonoEnv>()
    .get('/menu', controller.listMenu)
    .get('/menu/products/:slugOrId', controller.getProduct)
    .get('/menu/sitemap', controller.listSitemap);
}

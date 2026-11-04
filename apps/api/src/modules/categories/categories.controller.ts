import { activationInputSchema, reorderInputSchema } from '@salgae/core/contracts/admin-api';
import { categoryFormSchema } from '@salgae/core/schemas/category';
import type { Context } from 'hono';

import { readJsonBody, readUuidParam } from '../../shared/http/index';
import { serviceForRequest, type ServiceFactory } from '../../shared/supabase/request-service';
import type { AppHonoEnv } from '../../shared/types';
import type { CategoriesService } from './categories.service';

type CategoriesContext = Context<AppHonoEnv>;

const readCategoryId = (context: CategoriesContext) =>
  readUuidParam(context, 'id', 'Categoria inválida.');

export function createCategoriesController(createService: ServiceFactory<CategoriesService>) {
  const service = (context: CategoriesContext) => serviceForRequest(context, createService);
  return {
    list: async (context: CategoriesContext) =>
      context.json(await service(context).listCategories()),
    create: async (context: CategoriesContext) => {
      const input = await readJsonBody(context, categoryFormSchema);
      return context.json({ id: await service(context).createCategory(input) }, 201);
    },
    update: async (context: CategoriesContext) => {
      const id = readCategoryId(context);
      await service(context).updateCategory(id, await readJsonBody(context, categoryFormSchema));
      return context.body(null, 204);
    },
    setActive: async (context: CategoriesContext) => {
      const id = readCategoryId(context);
      const input = await readJsonBody(context, activationInputSchema);
      await service(context).setCategoryActive(id, input);
      return context.body(null, 204);
    },
    move: async (context: CategoriesContext) => {
      const id = readCategoryId(context);
      await service(context).moveCategory(id, await readJsonBody(context, reorderInputSchema));
      return context.body(null, 204);
    },
    delete: async (context: CategoriesContext) => {
      await service(context).deleteCategory(readCategoryId(context));
      return context.body(null, 204);
    },
  };
}

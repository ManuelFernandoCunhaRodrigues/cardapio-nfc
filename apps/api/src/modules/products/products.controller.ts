import {
  productInputSchema,
  productSituationInputSchema,
  reorderInputSchema,
} from '@salgae/core/contracts/admin-api';
import type { Context } from 'hono';

import { readJsonBody, readUuidParam } from '../../shared/http/index';
import { serviceForRequest, type ServiceFactory } from '../../shared/supabase/request-service';
import type { AppHonoEnv } from '../../shared/types';
import type { ProductsService } from './products.service';

type ProductsContext = Context<AppHonoEnv>;
const readProductId = (context: ProductsContext) =>
  readUuidParam(context, 'id', 'Produto inválido.');

export function createProductsController(createService: ServiceFactory<ProductsService>) {
  const service = (context: ProductsContext) => serviceForRequest(context, createService);
  return {
    list: async (context: ProductsContext) => context.json(await service(context).listProducts()),
    create: async (context: ProductsContext) => {
      const input = await readJsonBody(context, productInputSchema);
      return context.json({ id: await service(context).createProduct(input) }, 201);
    },
    update: async (context: ProductsContext) => {
      await service(context).updateProduct(
        readProductId(context),
        await readJsonBody(context, productInputSchema),
      );
      return context.body(null, 204);
    },
    setSituation: async (context: ProductsContext) => {
      await service(context).setProductSituation(
        readProductId(context),
        await readJsonBody(context, productSituationInputSchema),
      );
      return context.body(null, 204);
    },
    move: async (context: ProductsContext) => {
      await service(context).moveProduct(
        readProductId(context),
        await readJsonBody(context, reorderInputSchema),
      );
      return context.body(null, 204);
    },
    delete: async (context: ProductsContext) => {
      await service(context).deleteProduct(readProductId(context));
      return context.body(null, 204);
    },
  };
}

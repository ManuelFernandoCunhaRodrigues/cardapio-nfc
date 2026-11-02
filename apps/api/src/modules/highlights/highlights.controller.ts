import { activationInputSchema, reorderInputSchema } from '@salgae/core/contracts/admin-api';
import { highlightFormSchema } from '@salgae/core/schemas/highlight';
import type { Context } from 'hono';

import { readJsonBody, readUuidParam } from '../../shared/http/index.js';
import { serviceForRequest, type ServiceFactory } from '../../shared/supabase/request-service.js';
import type { AppHonoEnv } from '../../shared/types.js';
import type { HighlightsService } from './highlights.service.js';

type HighlightsContext = Context<AppHonoEnv>;

const readHighlightId = (context: HighlightsContext) =>
  readUuidParam(context, 'id', 'Destaque inválido.');

export function createHighlightsController(createService: ServiceFactory<HighlightsService>) {
  const service = (context: HighlightsContext) => serviceForRequest(context, createService);
  return {
    list: async (context: HighlightsContext) =>
      context.json(await service(context).listHighlights()),
    create: async (context: HighlightsContext) => {
      const input = await readJsonBody(context, highlightFormSchema);
      return context.json({ id: await service(context).createHighlight(input) }, 201);
    },
    update: async (context: HighlightsContext) => {
      const id = readHighlightId(context);
      await service(context).updateHighlight(id, await readJsonBody(context, highlightFormSchema));
      return context.body(null, 204);
    },
    setActive: async (context: HighlightsContext) => {
      const id = readHighlightId(context);
      const input = await readJsonBody(context, activationInputSchema);
      await service(context).setHighlightActive(id, input);
      return context.body(null, 204);
    },
    move: async (context: HighlightsContext) => {
      const id = readHighlightId(context);
      await service(context).moveHighlight(id, await readJsonBody(context, reorderInputSchema));
      return context.body(null, 204);
    },
    delete: async (context: HighlightsContext) => {
      await service(context).deleteHighlight(readHighlightId(context));
      return context.body(null, 204);
    },
  };
}

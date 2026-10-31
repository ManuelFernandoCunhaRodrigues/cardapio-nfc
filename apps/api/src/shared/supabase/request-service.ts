import type { Context } from 'hono';

import type { AppHonoEnv } from '../types.js';
import type { AppSupabaseClient } from './supabase-client-factory.js';

/** Monta o service de um módulo com um cliente Supabase (anon ou o da requisição do admin). */
export type ServiceFactory<TService> = (client: AppSupabaseClient) => TService;

/** Service da requisição atual, com o cliente que `requireAdmin` criou a partir do token. */
export function serviceForRequest<TService>(
  context: Context<AppHonoEnv>,
  createService: ServiceFactory<TService>,
): TService {
  return createService(context.get('supabase'));
}

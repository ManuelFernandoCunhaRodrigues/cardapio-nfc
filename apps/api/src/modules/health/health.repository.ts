import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import type { HealthRepository } from './health.service.js';

const HEALTH_QUERY_TIMEOUT_MS = 2_000;

export class SupabaseHealthRepository implements HealthRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async checkConnection(): Promise<void> {
    const { error } = await this.supabase
      .from('store_settings')
      .select('id')
      .limit(1)
      .retry(false)
      .abortSignal(AbortSignal.timeout(HEALTH_QUERY_TIMEOUT_MS));
    if (error) throw error;
  }
}

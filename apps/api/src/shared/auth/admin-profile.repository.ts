import type { AccessProfile } from '@salgae/core/rules/admin-access';

import type { AppSupabaseClient } from '../supabase/supabase-client-factory';

export type AdminProfile = AccessProfile & { name: string | null };

export class SupabaseAdminProfileRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async findById(userId: string): Promise<AdminProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('role, is_active, name')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

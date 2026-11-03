import type { StoreStatusInput } from '@salgae/core/contracts/admin-api';
import {
  publicStoreResponseSchema,
  type PublicStoreResponse,
} from '@salgae/core/contracts/public-api';
import type { storeSettingsFormSchema } from '@salgae/core/schemas/store-settings';
import type { z } from 'zod';

import { NotFoundError } from '../../shared/errors/domain-errors';

export type StoreSettingsInput = z.infer<typeof storeSettingsFormSchema>;

export interface StoreRepository {
  findSettings(): Promise<unknown>;
  /** Devolve `false` quando a linha única de configurações não existe. */
  updateSettings(input: Partial<StoreSettingsInput>): Promise<boolean>;
}

const settingsNotFoundMessage = 'Configurações da loja não encontradas.';

export class StoreService {
  constructor(private readonly repository: StoreRepository) {}

  async getSettings(): Promise<PublicStoreResponse> {
    const settings = await this.repository.findSettings();
    if (!settings) throw new NotFoundError(settingsNotFoundMessage);
    return publicStoreResponseSchema.parse(settings);
  }

  async updateSettings(input: StoreSettingsInput): Promise<void> {
    await this.saveSettings(input);
  }

  async updateStatusOverride({ status_override }: StoreStatusInput): Promise<void> {
    await this.saveSettings({ status_override });
  }

  private async saveSettings(input: Partial<StoreSettingsInput>): Promise<void> {
    const updated = await this.repository.updateSettings(input);
    if (!updated) throw new NotFoundError(settingsNotFoundMessage);
  }
}

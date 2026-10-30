import {
  publicStoreResponseSchema,
  type PublicStoreResponse,
} from '@salgae/core/contracts/public-api';

import { NotFoundError } from '../../shared/errors/domain-errors.js';

export interface StoreRepository {
  findPublicSettings(): Promise<unknown>;
}

export class StoreService {
  constructor(private readonly repository: StoreRepository) {}

  async getPublicSettings(): Promise<PublicStoreResponse> {
    const settings = await this.repository.findPublicSettings();
    if (!settings) throw new NotFoundError('Configurações da loja não encontradas.');
    return publicStoreResponseSchema.parse(settings);
  }
}

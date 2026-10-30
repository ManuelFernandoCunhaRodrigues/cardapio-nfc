export interface HealthRepository {
  checkConnection(): Promise<void>;
}

export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async isHealthy(): Promise<boolean> {
    try {
      await this.repository.checkConnection();
      return true;
    } catch {
      return false;
    }
  }
}

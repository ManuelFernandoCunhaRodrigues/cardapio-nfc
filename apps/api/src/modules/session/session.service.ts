import type { AdminSessionResponse } from '@salgae/core/contracts/admin-api';

export type SessionUser = {
  id: string;
  email?: string;
};

export class SessionService {
  getSession(user: SessionUser, name: string | null): AdminSessionResponse {
    return { userId: user.id, email: user.email ?? null, name, role: 'admin' };
  }
}

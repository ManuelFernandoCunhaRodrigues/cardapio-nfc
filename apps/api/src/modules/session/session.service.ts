export type SessionUser = {
  id: string;
  email?: string;
};

export class SessionService {
  getSession(user: SessionUser) {
    return { userId: user.id, email: user.email ?? null, role: 'admin' as const };
  }
}

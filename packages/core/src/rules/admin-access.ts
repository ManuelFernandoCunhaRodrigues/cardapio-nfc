export type AccessProfile = { role: string; is_active: boolean };

/** Só um perfil com papel `admin` e ativo entra no painel; sem perfil, a conta não tem acesso. */
export function isActiveAdmin<T extends AccessProfile>(profile: T | null): profile is T {
  return profile?.role === 'admin' && profile.is_active;
}

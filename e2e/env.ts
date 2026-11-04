export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} para executar os testes E2E.`);
  return value;
}

export const port = Number(process.env.E2E_PORT ?? 3000);
export const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
// A API roda dentro do site e responde em `/api`.
export const apiURL = `${baseURL}/api`;

// Sessão do administrador gravada pelo projeto `setup` e reaproveitada pelos demais.
export const adminStorageState = 'playwright/.auth/admin.json';

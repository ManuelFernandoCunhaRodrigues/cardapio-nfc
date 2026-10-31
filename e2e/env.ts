export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} para executar os testes E2E.`);
  return value;
}

export const apiPort = Number(process.env.E2E_API_PORT ?? 4000);
export const apiURL = process.env.E2E_API_URL ?? `http://127.0.0.1:${apiPort}`;

// Sessão do administrador gravada pelo projeto `setup` e reaproveitada pelos demais.
export const adminStorageState = 'playwright/.auth/admin.json';

import { z } from 'zod';

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL deve conter uma URL válida do projeto Supabase.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY deve conter a chave anônima/publicável do Supabase.'),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

export function getSupabaseEnv(): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join(' ');
    throw new Error(`Configuração do Supabase ausente ou inválida. ${details}`);
  }

  return parsed.data;
}

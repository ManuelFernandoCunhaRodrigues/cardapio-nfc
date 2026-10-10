import { z } from 'zod';

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL deve conter uma URL válida do projeto Supabase.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY deve conter a chave anônima/publicável do Supabase.'),
});

const siteEnvSchema = z.enum(['production', 'staging']);

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
export type SiteEnv = z.infer<typeof siteEnvSchema>;

export function getSiteEnv(): SiteEnv {
  const parsed = siteEnvSchema.safeParse(process.env.NEXT_PUBLIC_SITE_ENV);
  return parsed.success ? parsed.data : 'staging';
}

export function getSiteUrl(): URL | undefined {
  const parsed = z.string().url().safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  return parsed.success ? new URL(parsed.data) : undefined;
}

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

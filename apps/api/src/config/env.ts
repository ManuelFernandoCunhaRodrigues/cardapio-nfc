import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.url('must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'is required'),
  WEB_ORIGIN: z
    .url('must be a valid URL')
    .refine((value) => new URL(value).origin === value, 'must contain only the origin'),
  PORT: z.coerce.number().int().positive().max(65_535).optional(),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid API environment: ${details}`);
}

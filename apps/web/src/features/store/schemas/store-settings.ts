import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.');
const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Use no máximo ${maxLength} caracteres.`)
    .nullable()
    .transform((value) => value || null);
const optionalDigits = z
  .string()
  .trim()
  .nullable()
  .transform((value) => value?.replace(/\D/g, '') || null)
  .refine(
    (value) => value === null || /^[1-9]\d{7,14}$/.test(value),
    'Informe um telefone com DDI válido.',
  );
const optionalUrl = z
  .string()
  .trim()
  .nullable()
  .transform((value) => value || null)
  .refine((value) => value === null || /^https?:\/\//i.test(value), 'Informe uma URL válida.')
  .refine((value) => value === null || z.url().safeParse(value).success, 'Informe uma URL válida.');

export const openingHourSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    closed: z.boolean(),
    open: timeSchema,
    close: timeSchema,
  })
  .refine((hour) => hour.closed || hour.close > hour.open, {
    message: 'O fechamento deve ser posterior à abertura.',
    path: ['close'],
  });

export const storeSettingsFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Informe o nome da loja.')
      .max(120, 'Use no máximo 120 caracteres.'),
    tagline: optionalText(140),
    address: optionalText(300),
    maps_url: optionalUrl,
    phone: optionalDigits,
    whatsapp: optionalDigits,
    instagram: z
      .string()
      .trim()
      .nullable()
      .transform((value) => value?.replace(/^@+/, '') || null)
      .refine(
        (value) => value === null || /^[A-Za-z0-9._]{1,30}$/.test(value),
        'Informe apenas o usuário do Instagram, sem @.',
      ),
    opening_hours: z.array(openingHourSchema).length(7, 'Informe os sete dias da semana.'),
    status_override: z.enum(['auto', 'open', 'closed']),
    notice: optionalText(140),
  })
  .superRefine((settings, context) => {
    const days = new Set(settings.opening_hours.map((hour) => hour.day));
    if (days.size !== 7) {
      context.addIssue({
        code: 'custom',
        path: ['opening_hours'],
        message: 'Cada dia da semana deve aparecer uma única vez.',
      });
    }
  });

export const storeSettingsSchema = storeSettingsFormSchema.safeExtend({
  id: z.literal(true),
  updated_at: z.string(),
});

export type OpeningHour = z.infer<typeof openingHourSchema>;
export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type StoreSettingsFormValues = z.infer<typeof storeSettingsFormSchema>;

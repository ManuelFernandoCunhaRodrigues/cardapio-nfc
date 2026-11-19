import type { FieldErrors } from '@salgae/core/contracts/admin-api';
import type { Context } from 'hono';
import { z } from 'zod';

import { NotFoundError, ValidationError } from '../errors/domain-errors';
import type { AppHonoEnv } from '../types';

const INVALID_FORM_MESSAGE = 'Revise os campos destacados antes de salvar.';
const INVALID_BODY_MESSAGE = 'O corpo da requisição precisa ser um JSON válido.';

function toFieldErrors(error: z.ZodError): FieldErrors {
  return error.issues.reduce<FieldErrors>((fieldErrors, issue) => {
    const field = issue.path.join('.');
    if (field) fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
    return fieldErrors;
  }, {});
}

async function readJson(context: Context<AppHonoEnv>): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    throw new ValidationError(INVALID_BODY_MESSAGE);
  }
}

/** Lê o corpo JSON e o valida com o schema do contrato; falha vira 400 com erros por campo. */
export async function readJsonBody<T>(
  context: Context<AppHonoEnv>,
  schema: z.ZodType<T>,
): Promise<T> {
  const parsed = schema.safeParse(await readJson(context));
  if (!parsed.success) throw new ValidationError(INVALID_FORM_MESSAGE, toFieldErrors(parsed.error));
  return parsed.data;
}

export function readUuidParam(
  context: Context<AppHonoEnv>,
  name: string,
  invalidMessage: string,
): string {
  const parsed = z.uuid().safeParse(context.req.param(name));
  if (!parsed.success) throw new ValidationError(invalidMessage);
  return parsed.data;
}

const slugOrIdSchema = z.union([
  z.uuid(),
  z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
]);

/** Lê o identificador público de produto sem encaminhar texto arbitrário ao banco. */
export function readSlugOrIdParam(context: Context<AppHonoEnv>, invalidMessage: string): string {
  const parsed = slugOrIdSchema.safeParse(context.req.param('slugOrId'));
  if (!parsed.success) throw new NotFoundError(invalidMessage);
  return parsed.data;
}

import { HTTPException } from 'hono/http-exception';
import { describe, expect, it } from 'vitest';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './domain-errors';
import { mapErrorToHttp } from './http-error-mapper';

describe('mapErrorToHttp', () => {
  it.each([
    ['validação', new ValidationError('invalid'), 400],
    ['autenticação', new UnauthorizedError('unauthorized'), 401],
    ['autorização', new ForbiddenError('forbidden'), 403],
    ['recurso ausente', new NotFoundError('not found'), 404],
    ['conflito', new ConflictError('conflict'), 409],
  ])('mapeia o erro de %s para o status correto', (_label, error, status) => {
    expect(mapErrorToHttp(error)).toEqual({ status, message: error.message, report: false });
  });

  it('repassa os erros por campo de um erro de domínio', () => {
    const error = new ConflictError('Esse endereço curto já está em uso. Escolha outro.', {
      slug: ['Esse endereço curto já está em uso.'],
    });

    expect(mapErrorToHttp(error)).toMatchObject({
      status: 409,
      fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
    });
  });

  it('mapeia o timeout do Hono sem expor sua mensagem interna', () => {
    const result = mapErrorToHttp(new HTTPException(504, { message: 'internal timeout' }));

    expect(result).toEqual({
      status: 504,
      message: 'A solicitação demorou mais que o esperado.',
      report: true,
    });
  });

  it('mapeia um erro desconhecido para resposta interna segura', () => {
    const result = mapErrorToHttp(new Error('database password'));

    expect(result.status).toBe(500);
    expect(result.message).not.toContain('password');
    expect(result.report).toBe(true);
  });
});

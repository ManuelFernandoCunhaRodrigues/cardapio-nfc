import { describe, expect, it, vi } from 'vitest';

import { describeError, reportServerError } from './observability.js';

describe('observability', () => {
  it('descreve erros simples do Supabase', () => {
    expect(describeError({ message: 'failed', code: 'PGRST001', hint: 'retry' })).toEqual({
      message: 'failed',
      code: 'PGRST001',
      hint: 'retry',
    });
  });

  it('converte valores primitivos em mensagem', () => {
    expect(describeError('failed')).toEqual({ message: 'failed' });
  });

  it('registra uma linha JSON correlacionada pelo request id', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportServerError({ event: 'test.failed', error: new Error('failed'), requestId: 'request-1' });

    const record = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      level: 'error',
      app: 'salgae-api',
      event: 'test.failed',
      requestId: 'request-1',
      error: { name: 'Error', message: 'failed' },
    });
    log.mockRestore();
  });
});

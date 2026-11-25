import { describe, expect, test } from 'vitest';

import { buildContentSecurityPolicy, isServedOverHttps } from './csp';

function directive(policy: string, name: string): string[] {
  const entry = policy.split('; ').find((part) => part.startsWith(`${name} `));
  return entry ? entry.split(' ').slice(1) : [];
}

describe('buildContentSecurityPolicy', () => {
  const policy = buildContentSecurityPolicy({ supabaseUrl: 'https://abc.supabase.co/rest/v1' });

  test('libera o Supabase só onde ele é usado, pela origem', () => {
    expect(directive(policy, 'img-src')).toContain('https://abc.supabase.co');
    expect(directive(policy, 'media-src')).toContain('https://abc.supabase.co');
    expect(directive(policy, 'connect-src')).toEqual([
      "'self'",
      'https://abc.supabase.co',
      'wss://abc.supabase.co',
    ]);
    expect(directive(policy, 'script-src')).not.toContain('https://abc.supabase.co');
  });

  test('bloqueia scripts de fora, eval, object e moldura', () => {
    expect(directive(policy, 'script-src')).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directive(policy, 'object-src')).toEqual(["'none'"]);
    expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
    expect(directive(policy, 'form-action')).toEqual(["'self'"]);
  });

  test('em desenvolvimento libera eval para as ferramentas do React', () => {
    const dev = buildContentSecurityPolicy({ development: true });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
  });

  test('ignora URL do Supabase ausente ou inválida', () => {
    for (const supabaseUrl of [undefined, '', 'não é url']) {
      const result = buildContentSecurityPolicy({ supabaseUrl });
      expect(directive(result, 'img-src')).toEqual(["'self'", 'data:', 'blob:']);
      expect(directive(result, 'connect-src')).toEqual(["'self'"]);
    }
  });

  test('banco local em http vira ws para o tempo real', () => {
    const local = buildContentSecurityPolicy({ supabaseUrl: 'http://127.0.0.1:54321' });
    expect(directive(local, 'connect-src')).toContain('ws://127.0.0.1:54321');
  });
});

describe('upgrade-insecure-requests', () => {
  test('entra só quando o site é servido por https', () => {
    expect(buildContentSecurityPolicy({ upgradeInsecureRequests: true })).toContain(
      'upgrade-insecure-requests',
    );
    expect(buildContentSecurityPolicy()).not.toContain('upgrade-insecure-requests');
  });
});

describe('isServedOverHttps', () => {
  test('endereço público em https liga a diretiva', () => {
    expect(isServedOverHttps({ NEXT_PUBLIC_SITE_URL: 'https://salgae.vercel.app' })).toBe(true);
  });

  test('build na Vercel liga mesmo sem endereço público (stage hoje)', () => {
    expect(isServedOverHttps({ VERCEL: '1' })).toBe(true);
  });

  test('CI e máquina local em http ficam de fora', () => {
    expect(isServedOverHttps({})).toBe(false);
    expect(isServedOverHttps({ NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100' })).toBe(false);
    expect(isServedOverHttps({ VERCEL: '0', NEXT_PUBLIC_SITE_URL: '' })).toBe(false);
  });
});

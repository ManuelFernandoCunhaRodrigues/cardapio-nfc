import { describe, expect, it } from 'vitest';

import { safeAdminReturnPath, sessionExpiredLoginPath } from './session-return';

describe('safeAdminReturnPath', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/produtos', '/admin/produtos'],
    ['/admin/produtos/123?criado=1', '/admin/produtos/123?criado=1'],
    ['/admin/produtos?filtro=sem-foto&_rsc=abc', '/admin/produtos?filtro=sem-foto'],
  ])('aceita a tela do painel %s', (value, expected) => {
    expect(safeAdminReturnPath(value)).toBe(expected);
  });

  it.each([
    ['endereço de outro site', 'https://site.example/admin'],
    ['endereço sem protocolo', '//site.example/admin'],
    ['barra invertida no começo', '/\\site.example/admin'],
    ['barra invertida no meio', '/admin\\produtos'],
    ['tabulação que vira //', '/\t/site.example/admin'],
    ['quebra de linha', '/admin/produtos\n'],
    ['javascript:', 'javascript:alert(1)'],
    ['caminho relativo', 'admin/produtos'],
    ['fora do painel', '/cardapio'],
    ['prefixo parecido', '/administracao'],
    ['subida de pasta para fora', '/admin/../cardapio'],
    ['o próprio login', '/admin/login?voltar=/admin/produtos'],
    ['vazio', ''],
    ['ausente', null],
  ])('troca %s pelo início do painel', (_name, value) => {
    expect(safeAdminReturnPath(value)).toBe('/admin');
  });
});

describe('sessionExpiredLoginPath', () => {
  it('leva ao login com o motivo e a tela de origem', () => {
    expect(sessionExpiredLoginPath('/admin/produtos?filtro=sem-foto')).toBe(
      '/admin/login?motivo=sessao&voltar=%2Fadmin%2Fprodutos%3Ffiltro%3Dsem-foto',
    );
  });

  it('omite a volta quando ela seria o início do painel ou um endereço recusado', () => {
    expect(sessionExpiredLoginPath('/admin')).toBe('/admin/login?motivo=sessao');
    expect(sessionExpiredLoginPath('//site.example')).toBe('/admin/login?motivo=sessao');
    expect(sessionExpiredLoginPath(null)).toBe('/admin/login?motivo=sessao');
  });
});

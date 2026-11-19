// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { removeSearchParam } from './remove-search-param';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('removeSearchParam', () => {
  it('tira só o parâmetro pedido e mantém o caminho e os outros', () => {
    window.history.replaceState(null, '', '/admin/categorias?nova=1&ordem=nome');

    removeSearchParam('nova');

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/admin/categorias?ordem=nome',
    );
  });

  it('sem outros parâmetros, deixa a URL sem "?"', () => {
    window.history.replaceState(null, '', '/admin/destaques?novo=1');

    removeSearchParam('novo');

    expect(`${window.location.pathname}${window.location.search}`).toBe('/admin/destaques');
  });
});

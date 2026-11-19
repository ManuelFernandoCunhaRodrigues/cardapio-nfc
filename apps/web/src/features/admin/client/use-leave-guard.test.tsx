// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:3000/admin/produtos/novo"}
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLeaveGuard } from './use-leave-guard';

/** Clica num link e diz se o aviso segurou a navegação. O link em si nunca navega no teste. */
function clickLink(href: string, attributes: Record<string, string> = {}) {
  const link = document.createElement('a');
  link.href = href;
  for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
  link.textContent = 'ir';
  document.body.append(link);
  // Quando o aviso segura, ele também interrompe o clique antes de chegar ao link.
  let reachedLink = false;
  let preventedBefore = false;
  link.addEventListener('click', (event) => {
    reachedLink = true;
    preventedBefore = event.defaultPrevented;
    event.preventDefault();
  });
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  link.remove();
  return { defaultPrevented: !reachedLink || preventedBefore };
}

function beforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

const confirmSpy = vi.fn<(message?: string) => boolean>();

beforeEach(() => {
  confirmSpy.mockReset();
  // O happy-dom não traz window.confirm.
  Object.defineProperty(window, 'confirm', { configurable: true, value: confirmSpy });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Um teste que falhe no meio não deixa a Navigation API falsa para os seguintes.
  Reflect.deleteProperty(window, 'navigation');
});

describe('aviso ao sair de um formulário alterado', () => {
  it('sem alterações, não segura nada', () => {
    renderHook(() => useLeaveGuard(false));

    expect(beforeUnload().defaultPrevented).toBe(false);
    expect(clickLink('/admin/categorias').defaultPrevented).toBe(false);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('com alterações, o navegador pergunta antes de fechar ou recarregar', () => {
    renderHook(() => useLeaveGuard(true));

    expect(beforeUnload().defaultPrevented).toBe(true);
  });

  it('link do painel pergunta antes e fica parado se a pessoa desistir', () => {
    confirmSpy.mockReturnValue(false);
    renderHook(() => useLeaveGuard(true, 'Sair mesmo?'));

    expect(clickLink('/admin/categorias').defaultPrevented).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith('Sair mesmo?');
  });

  it('link do painel segue quando a pessoa confirma', () => {
    confirmSpy.mockReturnValue(true);
    renderHook(() => useLeaveGuard(true));

    expect(clickLink('/admin/categorias').defaultPrevented).toBe(false);
    expect(confirmSpy).toHaveBeenCalledOnce();
  });

  it('não pergunta em link que abre outra aba, de outro site ou da mesma tela', () => {
    renderHook(() => useLeaveGuard(true));

    clickLink('/admin/categorias', { target: '_blank' });
    clickLink('https://outro-site.test/pagina');
    clickLink(window.location.href);

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('voltar pelo navegador pergunta; navegação feita pelo código passa direto', () => {
    const navigation = new EventTarget();
    Object.defineProperty(window, 'navigation', { configurable: true, value: navigation });
    confirmSpy.mockReturnValue(false);
    renderHook(() => useLeaveGuard(true));

    const traverse = Object.assign(new Event('navigate', { cancelable: true }), {
      navigationType: 'traverse',
    });
    navigation.dispatchEvent(traverse);
    const push = Object.assign(new Event('navigate', { cancelable: true }), {
      navigationType: 'push',
    });
    navigation.dispatchEvent(push);

    expect(traverse.defaultPrevented).toBe(true);
    expect(push.defaultPrevented).toBe(false);
    expect(confirmSpy).toHaveBeenCalledOnce();
  });

  it('ao sair da tela, para de perguntar', () => {
    const { unmount } = renderHook(() => useLeaveGuard(true));
    unmount();

    expect(beforeUnload().defaultPrevented).toBe(false);
    expect(clickLink('/admin/categorias').defaultPrevented).toBe(false);
  });
});

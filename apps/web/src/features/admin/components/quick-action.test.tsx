// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuickAction, QuickActionGroup } from './quick-action';

type State = { status: 'idle' | 'success' | 'error'; message?: string };

/** Ação que só termina quando o teste manda, para olhar a tela no meio do caminho. */
function heldAction(result: State = { status: 'success', message: 'Ordem atualizada.' }) {
  let finish = () => {};
  const action = vi.fn<(state: State, formData: FormData) => Promise<State>>(
    () =>
      new Promise<State>((resolve) => {
        finish = () => resolve(result);
      }),
  );
  return { action, finish: () => finish() };
}

function renderList(action: (state: State, formData: FormData) => Promise<State>) {
  const other = vi.fn(async (): Promise<State> => ({ status: 'success' }));
  render(
    <QuickActionGroup>
      <QuickAction action={action} icon="up" label="Subir Coxinha" values={{ id: 'a' }} />
      <QuickAction action={other} icon="up" label="Subir Pastel" values={{ id: 'b' }} />
    </QuickActionGroup>,
  );
  return {
    other,
    moveUp: screen.getByRole('button', { name: 'Subir Coxinha' }),
    otherItem: screen.getByRole('button', { name: 'Subir Pastel' }),
  };
}

afterEach(cleanup);

describe('botão de ação rápida das listas do painel', () => {
  it('cliques no mesmo instante enviam um pedido só e travam a lista', async () => {
    const held = heldAction();
    const { moveUp, otherItem, other } = renderList(held.action);

    await act(async () => {
      moveUp.click();
      moveUp.click();
      moveUp.click();
      otherItem.click();
    });

    expect(held.action).toHaveBeenCalledOnce();
    expect(other).not.toHaveBeenCalled();
    expect(moveUp.getAttribute('aria-busy')).toBe('true');
    expect(otherItem.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByTestId('quick-action-spinner')).toBeTruthy();

    await act(async () => held.finish());

    expect(moveUp.getAttribute('aria-busy')).toBe('false');
    expect(otherItem.getAttribute('aria-disabled')).toBe('false');
  });

  it('envia os valores do item no pedido', async () => {
    const held = heldAction();
    const { moveUp } = renderList(held.action);

    await act(async () => moveUp.click());
    await act(async () => held.finish());

    const formData = held.action.mock.calls[0]![1];
    expect(formData.get('id')).toBe('a');
  });

  it('o erro aparece junto do botão que falhou', async () => {
    const held = heldAction({ status: 'error', message: 'Já está no limite da lista.' });
    const { moveUp } = renderList(held.action);

    await act(async () => moveUp.click());
    await act(async () => held.finish());

    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain(
      'Já está no limite da lista.',
    );
  });

  it('item desativado não envia nada', async () => {
    const action = vi.fn(async (): Promise<State> => ({ status: 'success' }));
    render(
      <QuickActionGroup>
        <QuickAction action={action} disabled icon="up" label="Subir Coxinha" values={{}} />
      </QuickActionGroup>,
    );

    await act(async () => screen.getByRole('button', { name: 'Subir Coxinha' }).click());

    expect(action).not.toHaveBeenCalled();
  });
});

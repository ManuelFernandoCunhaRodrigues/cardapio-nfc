import { describe, expect, it } from 'vitest';

import { fieldDefaults, readSubmittedValues } from './submitted-values';

describe('valores enviados num formulário recusado', () => {
  it('guarda só os textos digitados, sem arquivos nem campos internos da action', () => {
    const formData = new FormData();
    formData.set('name', 'Salgaê');
    formData.set('notice', '');
    formData.set('image', new File(['x'], 'foto.jpg'));
    formData.set('$ACTION_ID_abc', '');

    expect(readSubmittedValues(formData)).toEqual({ name: 'Salgaê', notice: '' });
  });

  it('usa o valor salvo enquanto nenhum envio foi recusado', () => {
    const defaults = fieldDefaults(undefined);

    expect(defaults.text('name', 'Salgaê')).toBe('Salgaê');
    expect(defaults.checked('is_active', true)).toBe(true);
  });

  it('volta ao que a pessoa enviou, inclusive texto apagado e caixa desmarcada', () => {
    const defaults = fieldDefaults({ name: 'Nome novo', description: '' });

    expect(defaults.text('name', 'Salgaê')).toBe('Nome novo');
    expect(defaults.text('description', 'Descrição salva')).toBe('');
    expect(defaults.text('tagline', 'Frase salva')).toBe('Frase salva');
    expect(defaults.checked('is_active', true)).toBe(false);
    expect(fieldDefaults({ is_active: 'on' }).checked('is_active', false)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { isPhotoUploadPending, type PhotoSaveState } from './photo-after-save';

const saved: PhotoSaveState = { status: 'success', message: 'Categoria criada.', entityId: 'c1' };

describe('isPhotoUploadPending', () => {
  it('fica ocupado entre salvar o registro e terminar o envio da foto', () => {
    expect(isPhotoUploadPending(saved, true, null)).toBe(true);
    expect(isPhotoUploadPending(saved, true, saved)).toBe(false);
  });

  it('não espera nada sem foto escolhida ou sem salvamento concluído', () => {
    expect(isPhotoUploadPending(saved, false, null)).toBe(false);
    expect(isPhotoUploadPending({ status: 'idle' }, true, null)).toBe(false);
    expect(isPhotoUploadPending({ status: 'error', message: 'Falhou.' }, true, null)).toBe(false);
    expect(isPhotoUploadPending({ status: 'success', message: 'Ok.' }, true, null)).toBe(false);
  });

  it('um novo salvamento volta a esperar a foto', () => {
    const again: PhotoSaveState = { ...saved };
    expect(isPhotoUploadPending(again, true, saved)).toBe(true);
  });
});

'use client';

import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';

/** Botão de salvar das gavetas: fica ocupado ao salvar e, depois, enquanto a foto sobe. */
export function EditorSubmitButton({
  label,
  uploadingPhoto,
}: Readonly<{ label: string; uploadingPhoto: boolean }>) {
  const { pending } = useFormStatus();
  const busy = pending || uploadingPhoto;
  return (
    <Button aria-busy={busy} className="w-full" disabled={busy} type="submit">
      {busy ? (
        <span
          aria-hidden="true"
          className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:hidden"
        />
      ) : null}
      {uploadingPhoto ? 'Enviando foto…' : pending ? 'Salvando…' : label}
    </Button>
  );
}

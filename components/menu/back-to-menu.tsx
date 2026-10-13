'use client';

import { useRouter } from 'next/navigation';

import { clearProductOrigin, hasInternalProductOrigin } from '@/lib/menu/product-origin';

import { Icon } from './icons';

export function BackToMenu({ iconOnly = false, fallback = '/cardapio' }: Readonly<{ iconOnly?: boolean; fallback?: string }>) {
  const router = useRouter();

  function goBack() {
    if (hasInternalProductOrigin(window.location.href)) {
      clearProductOrigin();
      window.history.back();
      return;
    }
    router.push(fallback);
  }

  return iconOnly
    ? <button aria-label="Voltar" className="absolute left-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white text-ink shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40" onClick={goBack} type="button"><Icon name="back" /></button>
    : <button className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 font-[family-name:var(--font-poppins)] text-sm font-semibold text-white focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40" onClick={goBack} type="button">Voltar</button>;
}

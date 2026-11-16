'use client';

import { useEffect, useState } from 'react';

import { Icon } from './icons';

const COPIED_FEEDBACK_MS = 2_000;

/**
 * Manda o link da página pelo compartilhar do celular (WhatsApp, por exemplo). Sem esse recurso,
 * como em parte dos computadores, copia o link e avisa.
 */
export function ShareButton({ storeName }: Readonly<{ storeName: string }>) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: document.title,
          text: `Cardápio da ${storeName}, com fotos e preços.`,
          url,
        });
      } catch {
        // A pessoa fechou a janela de compartilhar: nada a fazer.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Sem permissão para copiar: o endereço continua na barra do navegador.
    }
  }

  return (
    <div className="justify-self-end">
      <button
        aria-label="Compartilhar cardápio"
        className="grid size-11 place-items-center rounded-[14px] border border-border-inner bg-white text-ink shadow-card"
        onClick={share}
        type="button"
      >
        <Icon name={copied ? 'check' : 'share'} />
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copiado' : ''}
      </span>
    </div>
  );
}

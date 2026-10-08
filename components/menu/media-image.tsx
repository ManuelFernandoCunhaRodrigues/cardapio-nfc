/* eslint-disable @next/next/no-img-element -- URLs públicas do Storage não têm domínio fixo no build. */
'use client';

import { useState } from 'react';

type MediaImageProps = {
  src: string | null;
  alt: string;
  name: string;
  className?: string;
  priority?: boolean;
};

export function MediaImage({ src, alt, name, className = '', priority = false }: Readonly<MediaImageProps>) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div aria-label={`Imagem indisponível: ${name}`} className={`grid place-items-center bg-[repeating-linear-gradient(135deg,#2A2019_0,#2A2019_9px,#221A14_9px,#221A14_18px)] p-3 text-center ${className}`} role="img"><span className="max-w-full break-words font-mono text-[10px] uppercase tracking-[0.12em] text-cream/90">{name}</span></div>;
  }
  return <img alt={alt} className={`object-cover ${className}`} loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} src={src} />;
}

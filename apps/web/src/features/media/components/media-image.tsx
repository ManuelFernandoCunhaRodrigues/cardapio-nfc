/* eslint-disable @next/next/no-img-element -- URLs públicas do Storage não têm domínio fixo no build. */
'use client';

import { useState } from 'react';

import { CoxinhaArt } from '@/features/menu/components/coxinha-art';

type MediaImageProps = {
  src: string | null;
  alt: string;
  name: string;
  className?: string;
  priority?: boolean;
  srcSet?: string;
  sizes?: string;
};

export function MediaImage({
  src,
  alt,
  name,
  className = '',
  priority = false,
  srcSet,
  sizes,
}: Readonly<MediaImageProps>) {
  // Guarda qual endereço falhou: trocar o `src` (foto nova) tenta carregar de novo.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src)
    return (
      <div
        aria-hidden={alt ? undefined : true}
        aria-label={alt ? `Imagem indisponível: ${name}` : undefined}
        className={`grid place-items-center overflow-hidden bg-[linear-gradient(180deg,#FFF6E6,#FBE5C8)] ${className}`}
        role={alt ? 'img' : undefined}
      >
        <CoxinhaArt className="h-[82%] max-h-44 w-auto" />
      </div>
    );
  return (
    <img
      alt={alt}
      className={`object-cover ${className}`}
      fetchPriority={priority ? 'high' : undefined}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailedSrc(src)}
      sizes={sizes}
      src={src}
      srcSet={srcSet}
    />
  );
}

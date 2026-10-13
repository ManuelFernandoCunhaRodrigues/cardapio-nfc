/* eslint-disable @next/next/no-img-element -- URLs públicas do Storage não têm domínio fixo no build. */
'use client';

import { useState } from 'react';

import { CoxinhaArt } from './coxinha-art';

type MediaImageProps = { src: string | null; alt: string; name: string; className?: string; priority?: boolean; srcSet?: string; sizes?: string };

export function MediaImage({ src, alt, name, className = '', priority = false, srcSet, sizes }: Readonly<MediaImageProps>) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div aria-hidden={alt ? undefined : true} aria-label={alt ? `Imagem indisponível: ${name}` : undefined} className={`grid place-items-center overflow-hidden bg-[linear-gradient(180deg,#FFF6E6,#FBE5C8)] ${className}`} role={alt ? 'img' : undefined}><CoxinhaArt className="h-[82%] max-h-44 w-auto" /></div>;
  return <img alt={alt} className={`object-cover ${className}`} fetchPriority={priority ? 'high' : undefined} loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} sizes={sizes} src={src} srcSet={srcSet} />;
}

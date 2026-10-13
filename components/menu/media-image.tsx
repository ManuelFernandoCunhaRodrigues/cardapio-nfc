/* eslint-disable @next/next/no-img-element -- URLs públicas do Storage não têm domínio fixo no build. */
'use client';

import { useState } from 'react';

type MediaImageProps = { src: string | null; alt: string; name: string; className?: string; priority?: boolean; srcSet?: string; sizes?: string };

export function MediaImage({ src, alt, name, className = '', priority = false, srcSet, sizes }: Readonly<MediaImageProps>) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div aria-label={`Imagem indisponível: ${name}`} className={`grid place-items-center bg-[radial-gradient(circle_at_50%_85%,rgba(23,17,13,.12)_0_12%,transparent_13%),linear-gradient(180deg,#FFF6E6,#FBE5C8)] p-3 text-center ${className}`} role="img"><span aria-hidden="true" className="block size-16 rotate-45 rounded-[55%_45%_58%_42%] border-[3px] border-[#C4650F] bg-[linear-gradient(135deg,#FBB751,#E7841C)] shadow-[inset_6px_6px_0_rgba(255,255,255,.18)]" /></div>;
  return <img alt={alt} className={`object-cover ${className}`} fetchPriority={priority ? 'high' : undefined} loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} sizes={sizes} src={src} srcSet={srcSet} />;
}

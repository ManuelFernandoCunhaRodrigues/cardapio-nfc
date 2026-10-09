'use client';

import { useState } from 'react';

import { Icon } from './icons';
import { MediaImage } from './media-image';

type MediaVideoProps = { poster: string | null; video: string | null; name: string };

export function MediaVideo({ poster, video, name }: Readonly<MediaVideoProps>) {
  const [showVideo, setShowVideo] = useState(false);
  if (!video || !showVideo) return <div className="relative h-full w-full"><MediaImage alt={name} className="h-full w-full" name={name} priority src={poster} />{video ? <button aria-label={`Assistir vídeo de ${name}`} className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-ink/80 text-cream shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40" onClick={() => setShowVideo(true)} type="button"><Icon name="play" /></button> : null}</div>;
  return <video aria-label={`Vídeo de ${name}`} className="h-full w-full object-cover" controls loop muted playsInline poster={poster ?? undefined} preload="none" src={video}>Seu navegador não suporta vídeo.</video>;
}

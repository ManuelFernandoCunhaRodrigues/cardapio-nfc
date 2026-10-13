'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from './icons';
import { MediaImage } from './media-image';

type MediaVideoProps = { poster: string | null; posterSrcSet?: string; video: string | null; name: string };

export function MediaVideo({ poster, posterSrcSet, video, name }: Readonly<MediaVideoProps>) {
  const [showVideo, setShowVideo] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!showVideo || reduceMotion) return;
    void videoRef.current?.play().catch(() => {
      // O controle nativo continua disponível se o navegador recusar a reprodução.
    });
  }, [reduceMotion, showVideo]);

  if (!video || !showVideo) return <div className="relative h-full w-full"><MediaImage alt={name} className="h-full w-full" name={name} priority sizes="100vw" src={poster} srcSet={posterSrcSet} />{video ? <button aria-label={`Assistir vídeo de ${name}`} className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-white text-ink shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40" onClick={() => setShowVideo(true)} type="button"><Icon name="play" /></button> : null}</div>;
  return <video aria-label={`Vídeo de ${name}`} autoPlay={!reduceMotion} className="h-full w-full object-cover" controls loop={!reduceMotion} muted playsInline poster={poster ?? undefined} preload="none" ref={videoRef} src={video}>Seu navegador não suporta vídeo.</video>;
}

'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/features/menu/components/icons';
import { useMediaQuery } from '@/hooks/use-client-snapshot';
import { MediaImage } from './media-image';

type MediaVideoProps = {
  poster: string | null;
  posterSrcSet?: string;
  video: string | null;
  name: string;
};

export function MediaVideo({ poster, posterSrcSet, video, name }: Readonly<MediaVideoProps>) {
  // Guarda qual vídeo foi aberto: com outro `video`, volta para a foto com o botão.
  const [openedVideo, setOpenedVideo] = useState<string | null>(null);
  const showVideo = video !== null && openedVideo === video;
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const videoRef = useRef<HTMLVideoElement>(null);

  // O botão some ao trocar: o foco vai para o vídeo, e não para o começo da página. Com movimento
  // reduzido o vídeo não toca sozinho; os controles ficam à mão, já com o foco.
  useEffect(() => {
    const element = videoRef.current;
    if (!showVideo || !element) return;
    element.focus();
    if (reduceMotion) return;
    void element.play().catch(() => {
      // O controle nativo continua disponível se o navegador recusar a reprodução.
    });
  }, [reduceMotion, showVideo]);

  if (!video || !showVideo)
    return (
      <div className="relative h-full w-full">
        <MediaImage
          alt={name}
          className="h-full w-full"
          name={name}
          priority
          sizes="(max-width: 480px) 100vw, 480px"
          src={poster}
          srcSet={posterSrcSet}
        />
        {video ? (
          <button
            aria-label={`Assistir vídeo de ${name}`}
            className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-white text-ink shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40"
            onClick={() => setOpenedVideo(video)}
            type="button"
          >
            <Icon name="play" />
          </button>
        ) : null}
      </div>
    );
  return (
    <div className="h-[calc(100%_-_1.75rem)] w-full">
      <video
        aria-label={`Vídeo de ${name}`}
        className="h-full w-full object-cover"
        controls
        loop={!reduceMotion}
        muted
        playsInline
        poster={poster ?? undefined}
        preload="none"
        ref={videoRef}
        src={video}
      >
        Seu navegador não suporta vídeo.
      </video>
    </div>
  );
}

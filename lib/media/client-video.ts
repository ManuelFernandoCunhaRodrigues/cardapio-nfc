'use client';

export const VIDEO_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_DURATION_SECONDS = 15;
export const acceptedVideoTypes = ['video/mp4', 'video/webm'] as const;

export function isAcceptedVideoType(type: string): type is (typeof acceptedVideoTypes)[number] {
  return (acceptedVideoTypes as readonly string[]).includes(type);
}

export async function validateVideoForUpload(file: File): Promise<{ duration: number }> {
  if (!isAcceptedVideoType(file.type)) throw new Error('Escolha um vídeo MP4 ou WebM.');
  if (file.size > VIDEO_MAX_BYTES) throw new Error('O vídeo deve ter no máximo 10 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error('Não foi possível ler este vídeo.'));
      video.src = objectUrl;
    });
    if (!Number.isFinite(duration) || duration <= 0 || duration > VIDEO_MAX_DURATION_SECONDS) throw new Error('O vídeo deve durar no máximo 15 segundos.');
    return { duration };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

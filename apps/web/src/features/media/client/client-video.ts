'use client';

import {
  ACCEPTED_VIDEO_MIME_TYPES,
  VIDEO_DURATION_TOLERANCE_SECONDS,
  VIDEO_RAW_MAX_BYTES,
  type AcceptedVideoMimeType,
} from '@/features/media/server/video/constants';

export const VIDEO_MAX_BYTES = VIDEO_RAW_MAX_BYTES;
const VIDEO_MAX_DURATION_SECONDS = VIDEO_DURATION_TOLERANCE_SECONDS;
export const acceptedVideoTypes = ACCEPTED_VIDEO_MIME_TYPES;
const VIDEO_METADATA_TIMEOUT_MS = 8_000;

export function isAcceptedVideoType(type: string): type is (typeof acceptedVideoTypes)[number] {
  return (acceptedVideoTypes as readonly string[]).includes(type);
}

export function resolveVideoMimeType(
  file: Pick<File, 'name' | 'type'>,
): AcceptedVideoMimeType | null {
  if (isAcceptedVideoType(file.type)) return file.type;
  if (file.type && file.type !== 'video/x-m4v') return null;
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'mov' || extension === 'm4v') return 'video/quicktime';
  if (extension === 'webm') return 'video/webm';
  return null;
}

export async function validateVideoForUpload(
  file: File,
): Promise<{ duration: number | null; mimeType: AcceptedVideoMimeType }> {
  const mimeType = resolveVideoMimeType(file);
  if (!mimeType) throw new Error('Escolha um vídeo MP4, MOV ou WebM.');
  if (file.size <= 0) throw new Error('Este arquivo de vídeo está vazio.');
  if (file.size > VIDEO_MAX_BYTES)
    throw new Error('O vídeo deve ter no máximo 50 MB. Grave em Full HD (1080p), não em 4K.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number | null>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      let settled = false;
      const finish = (value: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute('src');
        video.load();
        resolve(value);
      };
      const timeout = setTimeout(() => finish(null), VIDEO_METADATA_TIMEOUT_MS);
      video.onloadedmetadata = () => finish(video.duration);
      video.onerror = () => finish(null);
      video.src = objectUrl;
    });
    if (duration !== null && Number.isFinite(duration) && duration > VIDEO_MAX_DURATION_SECONDS)
      throw new Error('O vídeo deve durar no máximo 15 segundos.');
    return {
      duration: duration !== null && Number.isFinite(duration) && duration > 0 ? duration : null,
      mimeType,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

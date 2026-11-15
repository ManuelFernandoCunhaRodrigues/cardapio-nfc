export const VIDEO_RAW_MAX_BYTES = 52_428_800;
export const VIDEO_DURATION_TOLERANCE_SECONDS = 15.5;

export const ACCEPTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export type AcceptedVideoMimeType = (typeof ACCEPTED_VIDEO_MIME_TYPES)[number];

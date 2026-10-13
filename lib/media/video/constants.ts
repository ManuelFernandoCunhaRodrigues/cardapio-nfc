export const VIDEO_RAW_MAX_BYTES = 52_428_800;
export const VIDEO_TARGET_BYTES = 3_145_728;
export const VIDEO_OUTPUT_MAX_BYTES = 4_194_304;
export const VIDEO_MAX_DURATION_SECONDS = 15;
export const VIDEO_DURATION_TOLERANCE_SECONDS = 15.5;
export const VIDEO_ORPHAN_AGE_MS = 30 * 60 * 1_000;
export const VIDEO_PROBE_TIMEOUT_MS = 10_000;
export const VIDEO_PROCESSING_TIMEOUT_MS = 150_000;
export const VIDEO_ROUTE_BUDGET_MS = 170_000;
export const VIDEO_DOWNLOAD_TIMEOUT_MS = 60_000;
export const VIDEO_UPLOAD_TIMEOUT_MS = 30_000;
export const VIDEO_FINALIZATION_RESERVE_MS = 20_000;
export const VIDEO_MAX_SIDE = 4_096;
export const VIDEO_MAX_PIXELS = 8_847_360;

export const ACCEPTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export type AcceptedVideoMimeType = (typeof ACCEPTED_VIDEO_MIME_TYPES)[number];

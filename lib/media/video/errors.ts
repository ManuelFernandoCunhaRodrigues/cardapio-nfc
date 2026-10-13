export type VideoErrorCode =
  | 'video_invalid'
  | 'video_too_long'
  | 'video_too_large'
  | 'video_dimensions_unsupported'
  | 'video_timeout'
  | 'video_compress_failed'
  | 'video_output_too_large';

export class VideoCompressionError extends Error {
  readonly code: VideoErrorCode;

  constructor(code: VideoErrorCode, message: string = code, options?: ErrorOptions) {
    super(message, options);
    this.name = 'VideoCompressionError';
    this.code = code;
  }
}

export function asVideoError(error: unknown, fallback: VideoErrorCode): VideoCompressionError {
  return error instanceof VideoCompressionError
    ? error
    : new VideoCompressionError(fallback, fallback, { cause: error });
}

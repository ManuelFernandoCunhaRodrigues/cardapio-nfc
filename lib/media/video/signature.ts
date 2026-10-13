import { VideoCompressionError } from './errors';

export type VideoContainer = {
  kind: 'mp4' | 'webm';
  demuxer: 'mov' | 'matroska';
};

function isEbmlHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 4
    && bytes[0] === 0x1a
    && bytes[1] === 0x45
    && bytes[2] === 0xdf
    && bytes[3] === 0xa3;
}

function hasWebmDocType(bytes: Uint8Array): boolean {
  for (let index = 4; index < bytes.length - 2; index += 1) {
    if (bytes[index] !== 0x42 || bytes[index + 1] !== 0x82) continue;
    const sizeByte = bytes[index + 2];
    if ((sizeByte & 0x80) === 0) continue;
    const size = sizeByte & 0x7f;
    const value = Buffer.from(bytes.subarray(index + 3, index + 3 + size)).toString('ascii').toLowerCase();
    if (value === 'webm') return true;
  }
  return false;
}

/** MIME e extensão não participam desta decisão. */
export function detectVideoContainer(bytes: Uint8Array): VideoContainer {
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(4, 8)).toString('ascii') === 'ftyp') {
    const boxSize = Buffer.from(bytes.subarray(0, 4)).readUInt32BE(0);
    if (boxSize >= 12 && boxSize <= bytes.length) return { kind: 'mp4', demuxer: 'mov' };
  }
  if (isEbmlHeader(bytes) && hasWebmDocType(bytes)) return { kind: 'webm', demuxer: 'matroska' };
  throw new VideoCompressionError('video_invalid');
}


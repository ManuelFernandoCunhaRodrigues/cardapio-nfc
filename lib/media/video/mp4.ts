import { VideoCompressionError } from './errors';

export type Mp4Box = { type: string; start: number; end: number };

export function parseTopLevelMp4Boxes(bytes: Uint8Array): Mp4Box[] {
  const buffer = Buffer.from(bytes);
  const boxes: Mp4Box[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    if (buffer.length - offset < 8) throw new VideoCompressionError('video_invalid');
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;
    if (size === 1) {
      if (buffer.length - offset < 16) throw new VideoCompressionError('video_invalid');
      const extended = buffer.readBigUInt64BE(offset + 8);
      if (extended > BigInt(Number.MAX_SAFE_INTEGER)) throw new VideoCompressionError('video_invalid');
      size = Number(extended);
      headerSize = 16;
    } else if (size === 0) {
      size = buffer.length - offset;
    }
    if (size < headerSize || offset + size > buffer.length) throw new VideoCompressionError('video_invalid');
    boxes.push({ type, start: offset, end: offset + size });
    offset += size;
  }
  return boxes;
}

export function hasFastStart(bytes: Uint8Array): boolean {
  const boxes = parseTopLevelMp4Boxes(bytes);
  const moov = boxes.find((box) => box.type === 'moov');
  const mdat = boxes.find((box) => box.type === 'mdat');
  return Boolean(moov && mdat && moov.end <= mdat.start);
}


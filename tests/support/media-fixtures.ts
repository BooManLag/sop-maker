export const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
export const box = (type: string, body: number[]) => [
  ...u32(8 + body.length),
  ...Buffer.from(type),
  ...body,
];
export const mp4 = (seconds: number, timescale = 1000) =>
  Uint8Array.from([
    ...box('ftyp', [...Buffer.from('M4A '), 0, 0, 0, 0]),
    ...box(
      'moov',
      box('mvhd', [
        0,
        0,
        0,
        0,
        ...u32(0),
        ...u32(0),
        ...u32(timescale),
        ...u32(seconds * timescale),
      ]),
    ),
  ]);
export const ebml = (docType: string, ...rest: number[]) =>
  Uint8Array.from([
    0x1a,
    0x45,
    0xdf,
    0xa3,
    0x87,
    0x42,
    0x82,
    0x84,
    ...Buffer.from(docType),
    ...rest,
  ]);
export const cluster = (ms: number) => [0x1f, 0x43, 0xb6, 0x75, 0x86, 0xe7, 0x84, ...u32(ms)];
export const webm = (...clusterMs: number[]) =>
  ebml(
    'webm',
    0x18,
    0x53,
    0x80,
    0x67,
    0x01,
    0xff,
    0xff,
    0xff,
    0xff,
    0xff,
    0xff,
    0xff,
    ...clusterMs.flatMap(cluster),
  );
const segment = [0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
const float64 = (n: number) => {
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleBE(n);
  return [...bytes];
};
/** WebM whose Segment Info carries an explicit Duration, as ffmpeg and OBS write it. */
export const webmWithDuration = (ms: number) =>
  ebml('webm', ...segment, 0x15, 0x49, 0xa9, 0x66, 0x8b, 0x44, 0x89, 0x88, ...float64(ms));
/** A file of `size` bytes holding `parts` at their offsets and zeros elsewhere; counts bytes read. */
export function sparseFile(size: number, parts: { at: number; bytes: Uint8Array }[]) {
  const file = {
    size,
    bytesRead: 0,
    async read(start: number, end: number) {
      const bytes = new Uint8Array(Math.max(0, Math.min(end, size) - start));
      for (const part of parts)
        for (let i = 0; i < part.bytes.length; i++) {
          const at = part.at + i - start;
          if (at >= 0 && at < bytes.length) bytes[at] = part.bytes[i];
        }
      file.bytesRead += bytes.length;
      return bytes;
    },
  };
  return file;
}
export const wholeFile = (bytes: Uint8Array) => sparseFile(bytes.length, [{ at: 0, bytes }]);
/** MP4 with its `moov` box after `mdatBytes` of media, as cameras write it without faststart. */
export function mp4MoovLast(seconds: number, mdatBytes: number, brand = 'isom') {
  const head = Uint8Array.from([
    ...box('ftyp', [...Buffer.from(brand), 0, 0, 0, 0]),
    ...u32(8 + mdatBytes),
    ...Buffer.from('mdat'),
  ]);
  const moov = mp4(seconds).subarray(box('ftyp', [0, 0, 0, 0, 0, 0, 0, 0]).length);
  return sparseFile(head.length + mdatBytes + moov.length, [
    { at: 0, bytes: head },
    { at: head.length + mdatBytes, bytes: moov },
  ]);
}
/** WebM without a Duration element, whose last cluster sits at the very end of a large file. */
export function webmLastClusterAt(ms: number, size: number) {
  const tail = Uint8Array.from(cluster(ms));
  return sparseFile(size, [
    { at: 0, bytes: webm(0) },
    { at: size - tail.length, bytes: tail },
  ]);
}

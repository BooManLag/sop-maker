import type { MediaContentType } from '../domain/types';
export type Inspection = { ok: true } | { ok: false; reason: string };
/** Allowance for the gap between the last WebM cluster start and the end of its audio. */
const toleranceSeconds = 2;
const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));
const uint = (bytes: Uint8Array, start: number, length: number) => {
  let value = 0;
  for (let i = 0; i < length; i++) value = value * 256 + (bytes[start + i] ?? 0);
  return value;
};
const ebmlMagic = [0x1a, 0x45, 0xdf, 0xa3];
const webmDocType = '\x42\x82\x84webm';
const signatures: Record<MediaContentType, (bytes: Uint8Array) => boolean> = {
  'audio/webm': (b) =>
    ebmlMagic.every((byte, i) => b[i] === byte) && ascii(b, 4, 64).includes(webmDocType),
  'audio/mp4': (b) => ascii(b, 4, 8) === 'ftyp',
};
/** Reads an EBML variable-length integer; returns its value and encoded length. */
function vint(bytes: Uint8Array, at: number) {
  const first = bytes[at] ?? 0;
  const length = first ? Math.clz32(first) - 23 : 9;
  if (length > 8) return undefined;
  let value = first & (0xff >> length);
  for (let i = 1; i < length; i++) value = value * 256 + (bytes[at + i] ?? 0);
  return { value, length };
}
function find(bytes: Uint8Array, id: number[], from: number) {
  outer: for (let i = from; i <= bytes.length - id.length; i++) {
    for (let j = 0; j < id.length; j++) if (bytes[i + j] !== id[j]) continue outer;
    return i;
  }
  return -1;
}
/** Seconds up to the last cluster start; undefined unless cluster times strictly increase. */
function webmSeconds(bytes: Uint8Array): number | undefined {
  const scaleAt = find(bytes, [0x2a, 0xd7, 0xb1], 0);
  const scaleSize = scaleAt < 0 ? undefined : vint(bytes, scaleAt + 3);
  const nanosPerTick = scaleSize
    ? uint(bytes, scaleAt + 3 + scaleSize.length, scaleSize.value)
    : 1_000_000;
  let last: number | undefined;
  for (let at = find(bytes, [0x1f, 0x43, 0xb6, 0x75], 0); at >= 0;) {
    const size = vint(bytes, at + 4);
    const timecodeAt = at + 4 + (size?.length ?? 0);
    const timecode = bytes[timecodeAt] === 0xe7 ? vint(bytes, timecodeAt + 1) : undefined;
    if (!timecode) return undefined;
    const ticks = uint(bytes, timecodeAt + 1 + timecode.length, timecode.value);
    if (last !== undefined && ticks <= last) return undefined;
    last = ticks;
    at = find(bytes, [0x1f, 0x43, 0xb6, 0x75], timecodeAt);
  }
  return last === undefined ? undefined : (last * nanosPerTick) / 1e9;
}
function mp4Seconds(bytes: Uint8Array): number | undefined {
  const child = (start: number, end: number, type: string) => {
    for (let at = start; at + 8 <= end;) {
      const size = uint(bytes, at, 4);
      if (size < 8) return undefined;
      if (ascii(bytes, at + 4, at + 8) === type) return { body: at + 8, end: at + size };
      at += size;
    }
    return undefined;
  };
  const moov = child(0, bytes.length, 'moov');
  const mvhd = moov && child(moov.body, moov.end, 'mvhd');
  if (!mvhd) return undefined;
  const wide = bytes[mvhd.body] === 1;
  const timescale = uint(bytes, mvhd.body + (wide ? 20 : 12), 4);
  const duration = uint(bytes, mvhd.body + (wide ? 24 : 16), wide ? 8 : 4);
  return timescale ? duration / timescale : undefined;
}
const durations: Record<MediaContentType, (bytes: Uint8Array) => number | undefined> = {
  'audio/webm': webmSeconds,
  'audio/mp4': mp4Seconds,
};
export function inspectMedia(
  bytes: Uint8Array,
  declared: MediaContentType,
  declaredSeconds: number,
): Inspection {
  if (!signatures[declared](bytes))
    return { ok: false, reason: 'File contents do not match the declared type.' };
  const seconds = durations[declared](bytes);
  if (seconds === undefined) return { ok: false, reason: 'Recording duration could not be read.' };
  if (seconds > declaredSeconds + toleranceSeconds)
    return { ok: false, reason: 'Recording is longer than its declared duration.' };
  return { ok: true };
}

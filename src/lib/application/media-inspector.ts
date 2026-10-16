import type { MediaContentType } from '../domain/types';
/** Random access to a stored recording, so inspection never loads the whole file. */
export interface ByteSource {
  size: number;
  /** Bytes from `start` up to, not including, `end`. */
  read(start: number, end: number): Promise<Uint8Array>;
}
export type Inspection = { ok: true; seconds: number } | { ok: false; reason: string };

const headBytes = 64 * 1024;
/** Long enough to hold a whole WebM cluster header at the end of the file. */
const tailBytes = 1024 * 1024;
const maxMoovBytes = 16 * 1024 * 1024;

/** Checks the bytes match the declared type and reads the recording's length from its headers. */
export async function inspectMedia(
  file: ByteSource,
  declared: MediaContentType,
): Promise<Inspection> {
  const head = await file.read(0, Math.min(file.size, headBytes));
  const container = declared.endsWith('/webm') ? webm : mp4;
  if (!container.matches(head))
    return { ok: false, reason: 'File contents do not match the declared type.' };
  const seconds = await container.seconds(file, head);
  if (seconds === undefined) return { ok: false, reason: 'Recording duration could not be read.' };
  return { ok: true, seconds };
}

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));
const uint = (bytes: Uint8Array, start: number, length: number) => {
  let value = 0;
  for (let i = 0; i < length; i++) value = value * 256 + (bytes[start + i] ?? 0);
  return value;
};

const ebmlMagic = [0x1a, 0x45, 0xdf, 0xa3];
const webmDocType = '\x42\x82\x84webm';
const clusterId = [0x1f, 0x43, 0xb6, 0x75];
const webm = {
  matches: (head: Uint8Array) =>
    ebmlMagic.every((byte, i) => head[i] === byte) && ascii(head, 4, 64).includes(webmDocType),
  /** The Segment Info Duration when the writer stored one, else the last cluster's start. */
  async seconds(file: ByteSource, head: Uint8Array) {
    const nanosPerTick = timecodeScale(head);
    const ticks = durationTicks(head) ?? lastClusterTicks(await tail(file));
    return ticks === undefined ? undefined : (ticks * nanosPerTick) / 1e9;
  },
};
const tail = (file: ByteSource) => file.read(Math.max(0, file.size - tailBytes), file.size);

/** Reads an EBML variable-length integer; returns its value and encoded length. */
function vint(bytes: Uint8Array, at: number) {
  const first = bytes[at] ?? 0;
  const length = first ? Math.clz32(first) - 23 : 9;
  if (length > 8) return undefined;
  let value = first & (0xff >> length);
  for (let i = 1; i < length; i++) value = value * 256 + (bytes[at + i] ?? 0);
  return { value, length };
}
function indexOf(bytes: Uint8Array, id: number[], from = 0) {
  outer: for (let i = from; i <= bytes.length - id.length; i++) {
    for (let j = 0; j < id.length; j++) if (bytes[i + j] !== id[j]) continue outer;
    return i;
  }
  return -1;
}
/** The body of the first `id` element before any cluster, where WebM keeps its metadata. */
function metadataElement(head: Uint8Array, id: number[]) {
  const firstCluster = indexOf(head, clusterId);
  const metadata = firstCluster < 0 ? head : head.subarray(0, firstCluster);
  const at = indexOf(metadata, id);
  const size = at < 0 ? undefined : vint(metadata, at + id.length);
  if (!size) return undefined;
  const body = at + id.length + size.length;
  return metadata.subarray(body, body + size.value);
}
function timecodeScale(head: Uint8Array) {
  const scale = metadataElement(head, [0x2a, 0xd7, 0xb1]);
  return scale?.length ? uint(scale, 0, scale.length) : 1_000_000;
}
function durationTicks(head: Uint8Array) {
  const duration = metadataElement(head, [0x44, 0x89]);
  if (duration?.length !== 4 && duration?.length !== 8) return undefined;
  const view = new DataView(duration.buffer, duration.byteOffset, duration.length);
  const ticks = duration.length === 4 ? view.getFloat32(0) : view.getFloat64(0);
  return Number.isFinite(ticks) && ticks > 0 ? ticks : undefined;
}
/** The timecode of the last well-formed cluster in `bytes`. */
function lastClusterTicks(bytes: Uint8Array) {
  for (let at = bytes.length - clusterId.length; at >= 0; at--) {
    if (!clusterId.every((byte, i) => bytes[at + i] === byte)) continue;
    const size = vint(bytes, at + clusterId.length);
    const timecodeAt = at + clusterId.length + (size?.length ?? 0);
    const timecode = bytes[timecodeAt] === 0xe7 ? vint(bytes, timecodeAt + 1) : undefined;
    if (timecode) return uint(bytes, timecodeAt + 1 + timecode.length, timecode.value);
  }
  return undefined;
}

const mp4 = {
  matches: (head: Uint8Array) => ascii(head, 4, 8) === 'ftyp',
  async seconds(file: ByteSource) {
    const moov = await topLevelBox(file, 'moov');
    const mvhd = moov && childBox(moov, 'mvhd');
    if (!mvhd) return undefined;
    const wide = mvhd[0] === 1;
    const timescale = uint(mvhd, wide ? 20 : 12, 4);
    const duration = uint(mvhd, wide ? 24 : 16, wide ? 8 : 4);
    return timescale ? duration / timescale : undefined;
  },
};
/** Walks the file's top-level boxes by their headers, skipping media data without reading it. */
async function topLevelBox(file: ByteSource, type: string) {
  for (let at = 0; at + 8 <= file.size;) {
    const header = await file.read(at, Math.min(file.size, at + 16));
    const { size, headerLength } = boxSize(header, file.size - at);
    if (size < headerLength) return undefined;
    if (ascii(header, 4, 8) === type)
      return size > maxMoovBytes ? undefined : file.read(at + headerLength, at + size);
    at += size;
  }
  return undefined;
}
/** Box sizes are 32-bit, or 64-bit when the 32-bit size is 1, or run to the end when it is 0. */
function boxSize(header: Uint8Array, remaining: number) {
  const size = uint(header, 0, 4);
  if (size === 1) return { size: uint(header, 8, 8), headerLength: 16 };
  return { size: size === 0 ? remaining : size, headerLength: 8 };
}
function childBox(parent: Uint8Array, type: string) {
  for (let at = 0; at + 8 <= parent.length;) {
    const size = uint(parent, at, 4);
    if (size < 8) return undefined;
    if (ascii(parent, at + 4, at + 8) === type) return parent.subarray(at + 8, at + size);
    at += size;
  }
  return undefined;
}

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
/** Long enough to hold a whole final fragment, header and media, of a fragmented MP4. */
const fragmentTailBytes = 8 * 1024 * 1024;

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
  /** The movie header's duration; fragmented files leave it zero, so their fragments are read. */
  async seconds(file: ByteSource) {
    const moov = await topLevelBox(file, 'moov');
    const mvhd = moov && childBox(moov, 'mvhd');
    if (!mvhd) return undefined;
    const wide = mvhd[0] === 1;
    const timescale = uint(mvhd, wide ? 20 : 12, 4);
    const duration = uint(mvhd, wide ? 24 : 16, wide ? 8 : 4);
    if (!timescale) return undefined;
    if (duration) return duration / timescale;
    const mehd = childBox(childBox(moov, 'mvex') ?? new Uint8Array(), 'mehd');
    const fragmentDuration = mehd && uint(mehd, 4, mehd[0] === 1 ? 8 : 4);
    if (fragmentDuration) return fragmentDuration / timescale;
    return fragmentedSeconds(file, moov);
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
/**
 * The body of the last fragment header, found in the file's tail rather than by walking every
 * fragment, which would cost one storage read each. A fragment header always opens with mfhd.
 */
async function lastFragment(file: ByteSource) {
  const bytes = await file.read(Math.max(0, file.size - fragmentTailBytes), file.size);
  for (let at = bytes.length - 16; at >= 0; at--) {
    if (ascii(bytes, at + 4, at + 8) !== 'moof' || ascii(bytes, at + 12, at + 16) !== 'mfhd')
      continue;
    const size = uint(bytes, at, 4);
    if (size >= 16 && at + size <= bytes.length) return bytes.subarray(at + 8, at + size);
  }
  return undefined;
}
/** Each track's media timescale, keyed by track ID. */
function trackTimescales(moov: Uint8Array) {
  const scales = new Map<number, number>();
  for (const trak of childBoxes(moov, 'trak')) {
    const tkhd = childBox(trak, 'tkhd');
    const mdhd = childBox(childBox(trak, 'mdia') ?? new Uint8Array(), 'mdhd');
    if (!tkhd || !mdhd) continue;
    const wide = (box: Uint8Array) => box[0] === 1;
    scales.set(uint(tkhd, wide(tkhd) ? 20 : 12, 4), uint(mdhd, wide(mdhd) ? 20 : 12, 4));
  }
  return scales;
}
/** The end of the last fragment: its decode time plus the durations of its samples. */
async function fragmentedSeconds(file: ByteSource, moov: Uint8Array) {
  const moof = await lastFragment(file);
  if (!moof) return undefined;
  const scales = trackTimescales(moov);
  let end = 0;
  for (const traf of childBoxes(moof, 'traf')) {
    const tfhd = childBox(traf, 'tfhd');
    const tfdt = childBox(traf, 'tfdt');
    const scale = tfhd && scales.get(uint(tfhd, 4, 4));
    if (!tfhd || !tfdt || !scale) continue;
    const ticks = uint(tfdt, 4, tfdt[0] === 1 ? 8 : 4) + trafDuration(traf, tfhd);
    end = Math.max(end, ticks / scale);
  }
  return end || undefined;
}
/** Sums sample durations across a fragment's runs, falling back to the fragment's default. */
function trafDuration(traf: Uint8Array, tfhd: Uint8Array) {
  const tfhdFlags = uint(tfhd, 1, 3);
  // Optional tfhd fields precede the default duration: base data offset, sample description index.
  const defaultAt = 8 + (tfhdFlags & 0x01 ? 8 : 0) + (tfhdFlags & 0x02 ? 4 : 0);
  const defaultDuration = tfhdFlags & 0x08 ? uint(tfhd, defaultAt, 4) : 0;
  let total = 0;
  for (const trun of childBoxes(traf, 'trun')) {
    const flags = uint(trun, 1, 3);
    const count = uint(trun, 4, 4);
    if (!(flags & 0x100)) {
      total += count * defaultDuration;
      continue;
    }
    const sampleBytes = [0x100, 0x200, 0x400, 0x800].filter((f) => flags & f).length * 4;
    let at = 8 + (flags & 0x01 ? 4 : 0) + (flags & 0x04 ? 4 : 0);
    for (let i = 0; i < count && at + 4 <= trun.length; i++, at += sampleBytes)
      total += uint(trun, at, 4);
  }
  return total;
}
/** Box sizes are 32-bit, or 64-bit when the 32-bit size is 1, or run to the end when it is 0. */
function boxSize(header: Uint8Array, remaining: number) {
  const size = uint(header, 0, 4);
  if (size === 1) return { size: uint(header, 8, 8), headerLength: 16 };
  return { size: size === 0 ? remaining : size, headerLength: 8 };
}
function childBox(parent: Uint8Array, type: string) {
  return childBoxes(parent, type)[0];
}
function childBoxes(parent: Uint8Array, type: string) {
  const found: Uint8Array[] = [];
  for (let at = 0; at + 8 <= parent.length;) {
    const size = uint(parent, at, 4);
    if (size < 8) break;
    if (ascii(parent, at + 4, at + 8) === type) found.push(parent.subarray(at + 8, at + size));
    at += size;
  }
  return found;
}

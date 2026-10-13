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

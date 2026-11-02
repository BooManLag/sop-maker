import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectMedia } from '../../src/lib/application/media-inspector';
import {
  box,
  cluster,
  ebml,
  fragmentedMp4,
  mp4,
  mp4MoovLast,
  webm,
  webmLastClusterAt,
  webmWithDuration,
  wholeFile,
} from '../support/media-fixtures';
const megabytes = (n: number) => n * 1_000_000;
test('audio and video recordings report the length read from the file', async () => {
  assert.deepEqual(await inspectMedia(wholeFile(webm(0, 5000)), 'audio/webm'), {
    ok: true,
    seconds: 5,
  });
  assert.deepEqual(await inspectMedia(wholeFile(mp4(10)), 'audio/mp4'), { ok: true, seconds: 10 });
  assert.deepEqual(await inspectMedia(wholeFile(webm(0, 7000)), 'video/webm'), {
    ok: true,
    seconds: 7,
  });
  assert.deepEqual(await inspectMedia(wholeFile(mp4(12, 44100)), 'video/mp4'), {
    ok: true,
    seconds: 12,
  });
});
test('a WebM Duration element is preferred over scanning clusters', async () => {
  assert.deepEqual(await inspectMedia(wholeFile(webmWithDuration(95_500)), 'video/webm'), {
    ok: true,
    seconds: 95.5,
  });
});
test('a 100 MB recording is measured from a bounded number of bytes', async () => {
  const camera = mp4MoovLast(1800, megabytes(100));
  assert.deepEqual(await inspectMedia(camera, 'video/mp4'), { ok: true, seconds: 1800 });
  assert.ok(camera.bytesRead < megabytes(2), `read ${camera.bytesRead} bytes`);
  const screen = webmLastClusterAt(1_200_000, megabytes(100));
  assert.deepEqual(await inspectMedia(screen, 'video/webm'), { ok: true, seconds: 1200 });
  assert.ok(screen.bytesRead < megabytes(2), `read ${screen.bytesRead} bytes`);
});
test('files whose bytes do not match the declared type are refused', async () => {
  assert.equal((await inspectMedia(wholeFile(mp4(10)), 'audio/webm')).ok, false);
  assert.equal((await inspectMedia(wholeFile(webm(0)), 'video/mp4')).ok, false);
  assert.equal((await inspectMedia(wholeFile(Buffer.from('<html>')), 'video/webm')).ok, false);
  const matroska = ebml('matroska', ...cluster(0));
  assert.equal((await inspectMedia(wholeFile(matroska), 'video/webm')).ok, false);
});
test('a recording whose length cannot be read is refused', async () => {
  assert.equal((await inspectMedia(wholeFile(webm()), 'audio/webm')).ok, false);
  const noMoov = Uint8Array.from(box('ftyp', [...Buffer.from('M4A ')]));
  assert.equal((await inspectMedia(wholeFile(noMoov), 'audio/mp4')).ok, false);
});

test('a fragmented MP4 is measured to the end of its last fragment', async () => {
  // Two 3 s fragments of 90 kHz samples; the movie header says zero.
  const second = 90_000;
  const file = fragmentedMp4([
    { startTicks: 0, sampleTicks: [second, second, second] },
    { startTicks: 3 * second, sampleTicks: [second, second, second] },
  ]);
  assert.deepEqual(await inspectMedia(wholeFile(file), 'video/mp4'), { ok: true, seconds: 6 });
});

test('a fragmented MP4 without fragments is refused rather than measured as zero', async () => {
  const file = fragmentedMp4([]);
  assert.equal((await inspectMedia(wholeFile(file), 'video/mp4')).ok, false);
});

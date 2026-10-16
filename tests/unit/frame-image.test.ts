import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeJpegUnder, fitWithin } from '../../src/features/capture/frame-image';

test('a frame is scaled down to fit the longest edge, never up', () => {
  assert.deepEqual(fitWithin(3840, 2160, 1280), { width: 1280, height: 720 });
  assert.deepEqual(fitWithin(1080, 1920, 1280), { width: 720, height: 1280 });
  assert.deepEqual(fitWithin(640, 360, 1280), { width: 640, height: 360 });
});
test('the image is re-encoded at lower quality until it fits the upload limit', async () => {
  const tried: number[] = [];
  // Size falls with quality: 0.85 → 850 KB, 0.75 → 750 KB, … 0.45 → 450 KB.
  const encode = async (quality: number) => {
    tried.push(quality);
    return new Blob([new Uint8Array(Math.round(quality * 1_000_000))]);
  };
  const image = await encodeJpegUnder(encode, 500_000);
  assert.equal(image.size, 450_000);
  assert.deepEqual(tried, [0.85, 0.75, 0.65, 0.55, 0.45]);
});
test('an image that cannot be made small enough is refused with a clear message', async () => {
  const encode = async () => new Blob([new Uint8Array(600_000)]);
  await assert.rejects(encodeJpegUnder(encode, 500_000), /too detailed/);
});

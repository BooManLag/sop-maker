import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectMedia } from '../../src/lib/application/media-inspector';
import { box, cluster, ebml, mp4, webm } from '../support/media-fixtures';
test('recorded audio is accepted when its bytes match the declared type', () => {
  assert.deepEqual(inspectMedia(webm(0, 5000), 'audio/webm', 10), { ok: true });
  assert.deepEqual(inspectMedia(mp4(10), 'audio/mp4', 10), { ok: true });
});
test('files whose bytes do not match the declared type are refused', () => {
  assert.equal(inspectMedia(mp4(10), 'audio/webm', 10).ok, false);
  assert.equal(inspectMedia(webm(0), 'audio/mp4', 10).ok, false);
  assert.equal(inspectMedia(Buffer.from('<html>'), 'audio/webm', 10).ok, false);
  assert.equal(inspectMedia(ebml('matroska', ...cluster(0)), 'audio/webm', 10).ok, false);
});
test('audio longer than its declared duration is refused', () => {
  assert.equal(inspectMedia(mp4(70, 44100), 'audio/mp4', 60).ok, false);
  assert.equal(inspectMedia(mp4(60, 44100), 'audio/mp4', 60).ok, true);
  assert.equal(inspectMedia(webm(0, 30_000, 75_000), 'audio/webm', 60).ok, false);
  assert.equal(inspectMedia(webm(0, 30_000, 55_000), 'audio/webm', 60).ok, true);
});
test('audio whose duration cannot be read is refused', () => {
  assert.equal(inspectMedia(webm(), 'audio/webm', 60).ok, false);
  assert.equal(inspectMedia(webm(0, 30_000, 10_000), 'audio/webm', 60).ok, false);
  assert.equal(
    inspectMedia(Uint8Array.from(box('ftyp', [...Buffer.from('M4A ')])), 'audio/mp4', 60).ok,
    false,
  );
});

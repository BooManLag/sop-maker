import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Backend } from '../../src/lib/application/backend';
import { MediaWorker } from '../../src/lib/application/media-worker';
import { JsonRepositoryProvider } from '../../src/lib/infrastructure/json-repository';
import { DemoGeminiAdapter } from '../../src/lib/infrastructure/demo-capture-adapter';
import { DemoTranscriber } from '../../src/lib/infrastructure/demo-transcriber';
import {
  LocalMediaLibrary,
  LocalMediaStore,
  LocalMediaUploads,
  LocalUploadSigner,
} from '../../src/lib/infrastructure/local-media';
import { GuardedCaptureAdapter } from '../../src/lib/server/ai';
import { transcriptionSchema } from '../../src/lib/server/contracts';
import { createHttpHandler } from '../../src/lib/server/http';
import { Observability } from '../../src/lib/server/observability';
import type { ServerConfig } from '../../src/lib/server/config';
import { mp4, webm } from '../support/media-fixtures';

/** The loopback demo runtime, composed as `runtime.ts` does, over a temporary directory. */
async function demo(now?: () => number) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'ge-local-media-'));
  const config: ServerConfig = {
    mode: 'demo',
    dataDir,
    allowedOrigins: [],
    databaseId: '(default)',
    requireMfa: false,
    emulator: false,
  };
  const repositories = new JsonRepositoryProvider(dataDir);
  const signer = new LocalUploadSigner(now);
  const store = new LocalMediaStore(path.join(dataDir, 'media'));
  const worker = new MediaWorker(repositories, store, new DemoTranscriber(), () => undefined);
  const backend = new Backend(
    repositories,
    config,
    new GuardedCaptureAdapter(new DemoGeminiAdapter()),
    undefined,
    signer,
    undefined,
    new LocalMediaLibrary(signer, store),
  );
  const handler = createHttpHandler({
    backend,
    config,
    verifier: { verify: async () => assert.fail('demo requests need no token') },
    observability: new Observability(() => undefined),
    mediaUploads: new LocalMediaUploads(signer, store, worker),
    mediaFiles: new LocalMediaLibrary(signer, store),
  });
  const call = async (pathname: string, init: RequestInit = {}, host = '127.0.0.1:3000') => {
    const url = new URL(pathname, `http://${host}/api/`);
    const segments = url.pathname.replace(/^\/api\//, '').split('/');
    const response = await handler(new Request(url, init), segments);
    return { status: response.status, body: await response.json().catch(() => undefined) };
  };
  const fetchRaw = async (pathname: string, headers: Record<string, string> = {}) => {
    const url = new URL(pathname, 'http://127.0.0.1:3000/');
    const segments = url.pathname.replace(/^\/api\//, '').split('/');
    const response = await handler(new Request(url, { headers }), segments);
    return {
      status: response.status,
      type: response.headers.get('content-type'),
      range: response.headers.get('content-range'),
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  };
  const post = (pathname: string, body: unknown) =>
    call(pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const process = (await post('v1/processes', { title: 'Valve', equipment: 'V-1' })).body as {
    id: string;
  };
  return { call, post, fetchRaw, process, dataDir, store };
}
const audio = { expertReference: 'expert_1', contentType: 'audio/webm', consent: true };
const put = (url: string, bytes: Uint8Array, contentType = 'audio/webm') => ({
  url: url.replace(/^\/api\//, ''),
  init: { method: 'PUT', headers: { 'content-type': contentType }, body: new Uint8Array(bytes) },
});

test('a demo recording uploads through a local signed URL and comes back transcribed', async () => {
  const { call, post, process } = await demo();
  const bytes = webm(0, 5000, 10000);
  const target = await post(`v1/processes/${process.id}/uploads`, {
    ...audio,
    bytes: bytes.byteLength,
  });
  assert.equal(target.status, 201);
  assert.match(target.body.url, /^\/api\/v1\/internal\/media-upload\?grant=/);
  const upload = put(target.body.url, bytes);
  assert.equal((await call(upload.url, upload.init)).status, 204);

  const capture = await call(`v1/captures/${target.body.uploadId}`);
  assert.equal(capture.body.status, 'transcribed');
  assert.equal(capture.body.durationMs, 10_000);
  assert.ok(capture.body.segments.length > 1);
  assert.ok(capture.body.segments.every((s: { endMs: number }) => s.endMs <= 10_000));
  const draft = await call(`v1/processes/${process.id}`);
  assert.equal(draft.body.versions[0].steps.length, capture.body.segments.length);
});

test('the expert can correct the transcript, but not move it outside the recording', async () => {
  const { call, post, process } = await demo();
  const bytes = webm(0, 4000);
  const target = await post(`v1/processes/${process.id}/uploads`, {
    ...audio,
    bytes: bytes.byteLength,
  });
  const upload = put(target.body.url, bytes);
  await call(upload.url, upload.init);
  const id = target.body.uploadId;
  const segments = (await call(`v1/captures/${id}`)).body.segments;
  segments[0].text = 'Isolate the supply at the main valve.';
  const saved = await post(`v1/captures/${id}/transcript`, { segments });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.segments[0].text, 'Isolate the supply at the main valve.');
  const outside = await post(`v1/captures/${id}/transcript`, {
    segments: [{ startMs: 0, endMs: 60_000, text: 'Too long' }],
  });
  assert.equal(outside.status, 400);
  assert.equal((await call(`v1/captures/${id}`)).body.segments[0].text, segments[0].text);
});

test('a transcript cannot be edited before the recording is transcribed', async () => {
  const { post, process } = await demo();
  const target = await post(`v1/processes/${process.id}/uploads`, { ...audio, bytes: 100 });
  const saved = await post(`v1/captures/${target.body.uploadId}/transcript`, {
    segments: [{ startMs: 0, endMs: 1000, text: 'Early' }],
  });
  assert.equal(saved.status, 409);
});

test('mismatched contents are rejected and removed without a transcript', async () => {
  const { call, post, process, dataDir } = await demo();
  const bytes = mp4(5);
  const target = await post(`v1/processes/${process.id}/uploads`, {
    ...audio,
    bytes: bytes.byteLength,
  });
  const upload = put(target.body.url, bytes);
  assert.equal((await call(upload.url, upload.init)).status, 204);
  const capture = await call(`v1/captures/${target.body.uploadId}`);
  assert.equal(capture.body.status, 'rejected');
  assert.deepEqual(capture.body.segments, []);
  const quarantine = path.join(dataDir, 'media', 'quarantine', 'demo-org', process.id);
  assert.deepEqual(await readdir(quarantine), []);
});

test('upload links are bound to their type, size, signature and lifetime', async () => {
  let now = Date.now();
  const { call, post, process } = await demo(() => now);
  const bytes = webm(0, 1000);
  const target = await post(`v1/processes/${process.id}/uploads`, {
    ...audio,
    bytes: bytes.byteLength,
  });
  const wrongType = put(target.body.url, bytes, 'audio/mp4');
  assert.equal((await call(wrongType.url, wrongType.init)).status, 415);
  const tooLarge = put(target.body.url, webm(0, 1000, 2000));
  assert.equal((await call(tooLarge.url, tooLarge.init)).status, 413);
  const tampered = put(
    target.body.url.replace(/.$/, (c: string) => (c === 'A' ? 'B' : 'A')),
    bytes,
  );
  assert.equal((await call(tampered.url, tampered.init)).status, 403);
  const remote = put(target.body.url, bytes);
  assert.equal((await call(remote.url, remote.init, 'app.example.com')).status, 404);
  now += 16 * 60_000;
  const expired = put(target.body.url, bytes);
  assert.equal((await call(expired.url, expired.init)).status, 403);
});

test('the local store only accepts server-built object paths and promotes idempotently', async () => {
  const store = new LocalMediaStore(await mkdtemp(path.join(tmpdir(), 'ge-store-')));
  await assert.rejects(store.write('quarantine/../../etc/passwd', new Uint8Array([1])));
  await assert.rejects(store.open('quarantine/org/process'));
  const from = 'quarantine/org/process/upload';
  const to = 'clean/org/process/upload';
  await store.write(from, new Uint8Array([1, 2, 3]));
  await store.promote(from, to);
  await store.promote(from, to);
  const file = await store.open(to);
  assert.equal(file.size, 3);
  assert.deepEqual([...(await file.read(1, 3))], [2, 3]);
  assert.equal(
    await store.sha256(to),
    '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81',
  );
  await store.write('quarantine/org/process/frames/f1', new Uint8Array([9]));
  assert.equal((await store.open('quarantine/org/process/frames/f1')).size, 1);
});

test('the demo transcription always satisfies the transcription contract', async () => {
  const transcriber = new DemoTranscriber();
  for (const seconds of [0.4, 3, 59.5, 600]) {
    const output = await transcriber.transcribe('clean/o/p/u', 'audio/webm', {
      durationSeconds: seconds,
    });
    assert.ok(
      transcriptionSchema(Math.ceil(seconds * 1000)).safeParse(output).success,
      `${seconds}s`,
    );
  }
  await assert.rejects(transcriber.transcribe('clean/o/p/u', 'audio/webm'));
});

async function demoWithFrame(now?: () => number) {
  const app = await demo(now);
  const recording = webm(0, 5000, 10000);
  const target = await app.post(`v1/processes/${app.process.id}/uploads`, {
    ...audio,
    bytes: recording.byteLength,
  });
  const upload = put(target.body.url, recording);
  await app.call(upload.url, upload.init);
  const draft = await app.call(`v1/processes/${app.process.id}`);
  const stepId = draft.body.versions[0].steps[0].id;
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const frame = await app.post(`v1/processes/${app.process.id}/frames`, {
    captureId: target.body.uploadId,
    stepId,
    atMs: 1000,
    bytes: jpeg.byteLength,
  });
  const frameUpload = put(frame.body.url, jpeg, 'image/jpeg');
  await app.call(frameUpload.url, frameUpload.init);
  const media = await app.call(`v1/processes/${app.process.id}/media`);
  return { ...app, recording, jpeg, stepId, media: media.body };
}
test('the demo serves step images and the recording through signed local links', async () => {
  const { fetchRaw, media, jpeg, stepId, recording } = await demoWithFrame();
  const image = await fetchRaw(media.frames[stepId]);
  assert.equal(image.status, 200);
  assert.equal(image.type, 'image/jpeg');
  assert.deepEqual([...image.bytes], [...jpeg]);
  assert.match(media.video.url, /^\/api\/v1\/internal\/media-file\?grant=/);
  const video = await fetchRaw(media.video.url, { range: 'bytes=4-9' });
  assert.equal(video.status, 206);
  assert.equal(video.type, 'audio/webm');
  assert.equal(video.range, `bytes 4-9/${recording.byteLength}`);
  assert.deepEqual([...video.bytes], [...recording.subarray(4, 10)]);
});
test('local media links refuse forged and expired grants', async () => {
  let now = Date.now();
  const { fetchRaw, media, stepId } = await demoWithFrame(() => now);
  const url: string = media.frames[stepId];
  assert.equal((await fetchRaw(url.replace(/.$/, url.endsWith('A') ? 'B' : 'A'))).status, 403);
  now += 16 * 60_000;
  assert.equal((await fetchRaw(url)).status, 403);
});

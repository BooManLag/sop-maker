import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Backend } from '../../src/lib/application/backend';
import { actor, execute, mediaHarness } from '../support/media-harness';
test('an expert gets a signed upload target for recorded audio within limits', async () => {
  const { backend, signed } = await mediaHarness();
  const p = (await execute(backend, 'POST', 'processes', { title: 'Pump', equipment: 'P-1' })) as {
    id: string;
  };
  const target = (await execute(backend, 'POST', `processes/${p.id}/uploads`, {
    kind: 'audio',
    expertReference: 'expert_1',
    contentType: 'audio/webm',
    bytes: 1_400_000,
    durationSeconds: 540,
  })) as { uploadId: string; method: string; url: string; headers: Record<string, string> };
  assert.equal(target.method, 'PUT');
  assert.match(target.url, /^https:\/\/storage\.example\/quarantine\/tenant_a\//);
  assert.equal(target.headers['content-type'], 'audio/webm');
  assert.equal(target.headers['x-goog-content-length-range'], '0,1400000');
  assert.equal(signed.at(-1)?.objectPath, `quarantine/tenant_a/${p.id}/${target.uploadId}`);
});
async function draft(backend: Backend) {
  return (
    (await execute(backend, 'POST', 'processes', { title: 'Pump', equipment: 'P-1' })) as {
      id: string;
    }
  ).id;
}
const audio = {
  kind: 'audio',
  expertReference: 'expert_1',
  contentType: 'audio/webm',
  bytes: 1_400_000,
  durationSeconds: 540,
};
test('uploads other than recorded audio are refused before anything is signed', async () => {
  const { backend, signed } = await mediaHarness();
  const id = await draft(backend);
  const before = signed.length;
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, contentType: 'video/mp4' }),
    /Invalid/,
  );
  assert.equal(signed.length, before);
});
test('audio larger than ten megabytes or longer than ten minutes is refused', async () => {
  const { backend } = await mediaHarness();
  const id = await draft(backend);
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, bytes: 10_000_001 }),
    /10000000/,
  );
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, durationSeconds: 601 }),
    /600/,
  );
});
test('a tenant cannot reserve more than 300 recorded minutes in a month', async () => {
  const { backend } = await mediaHarness();
  const id = await draft(backend);
  for (let i = 0; i < 29; i++)
    await execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, durationSeconds: 600 });
  await execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, durationSeconds: 570 });
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, durationSeconds: 60 }),
    (error: { status?: number }) => error.status === 429,
  );
  await execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, durationSeconds: 30 });
});
test("another tenant's process is not found and nothing is signed", async () => {
  const { backend, signed } = await mediaHarness();
  const id = await draft(backend);
  const before = signed.length;
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, audio, actor('tenant_b')),
    /not found/,
  );
  assert.equal(signed.length, before);
});

test('a finished upload is queued for transcription only once storage holds it', async () => {
  const { backend, objects, queued } = await mediaHarness();
  const id = await draft(backend);
  const target = (await execute(backend, 'POST', `processes/${id}/uploads`, audio)) as {
    uploadId: string;
  };
  await assert.rejects(
    execute(backend, 'POST', `captures/${target.uploadId}/uploaded`),
    /not finished/,
  );
  assert.equal(queued.length, 0);
  objects.set(`quarantine/tenant_a/${id}/${target.uploadId}`, new Uint8Array([1]));
  const capture = (await execute(backend, 'POST', `captures/${target.uploadId}/uploaded`)) as {
    status: string;
  };
  assert.equal(capture.status, 'awaiting_upload');
  assert.deepEqual(queued, [
    {
      url: 'https://app.example/api/v1/internal/media',
      job: { objectPath: `quarantine/tenant_a/${id}/${target.uploadId}` },
    },
  ]);
});

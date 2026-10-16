import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Backend } from '../../src/lib/application/backend';
import { mediaWorkerUrl } from '../../src/lib/server/cloud-tasks';
import { actor, execute, mediaHarness } from '../support/media-harness';
const audio = {
  expertReference: 'expert_1',
  contentType: 'audio/webm',
  bytes: 1_400_000,
  consent: true,
};
async function draft(backend: Backend) {
  return (
    (await execute(backend, 'POST', 'processes', { title: 'Pump', equipment: 'P-1' })) as {
      id: string;
    }
  ).id;
}
test('an expert gets a signed upload target for a recording within limits', async () => {
  const { backend, signed } = await mediaHarness();
  const id = await draft(backend);
  const target = (await execute(backend, 'POST', `processes/${id}/uploads`, audio)) as {
    uploadId: string;
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  assert.equal(target.method, 'PUT');
  assert.match(target.url, /^https:\/\/storage\.example\/quarantine\/tenant_a\//);
  assert.equal(target.headers['content-type'], 'audio/webm');
  assert.equal(target.headers['x-goog-content-length-range'], '0,1400000');
  assert.equal(signed.at(-1)?.objectPath, `quarantine/tenant_a/${id}/${target.uploadId}`);
});
test('MP4 and WebM video can be uploaded as a video capture', async () => {
  const { backend } = await mediaHarness();
  const id = await draft(backend);
  for (const contentType of ['video/mp4', 'video/webm']) {
    const target = (await execute(backend, 'POST', `processes/${id}/uploads`, {
      ...audio,
      contentType,
    })) as { uploadId: string; headers: Record<string, string> };
    assert.equal(target.headers['content-type'], contentType);
    const capture = (await execute(backend, 'GET', `captures/${target.uploadId}`)) as {
      kind: string;
    };
    assert.equal(capture.kind, 'video');
  }
});
test('other file types are refused before anything is signed', async () => {
  const { backend, signed } = await mediaHarness();
  const id = await draft(backend);
  const before = signed.length;
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, {
      ...audio,
      contentType: 'video/quicktime',
    }),
    /Invalid/,
  );
  assert.equal(signed.length, before);
});
test('recordings up to 100 MB are accepted and larger ones refused', async () => {
  const { backend } = await mediaHarness();
  const id = await draft(backend);
  await execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, bytes: 100_000_000 });
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, bytes: 100_000_001 }),
    /100000000/,
  );
});
test('a recording is refused unless everyone in it agreed to be recorded', async () => {
  const { backend, signed } = await mediaHarness();
  const id = await draft(backend);
  const before = signed.length;
  const withoutConsent = { ...audio, consent: undefined };
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, withoutConsent),
    /Invalid/,
  );
  await assert.rejects(
    execute(backend, 'POST', `processes/${id}/uploads`, { ...audio, consent: false }),
    /Invalid/,
  );
  assert.equal(signed.length, before);
});
test('the capture records who confirmed recording consent and when', async () => {
  const { backend } = await mediaHarness();
  const id = await draft(backend);
  const target = (await execute(backend, 'POST', `processes/${id}/uploads`, audio)) as {
    uploadId: string;
  };
  const capture = (await execute(backend, 'GET', `captures/${target.uploadId}`)) as {
    consent?: { confirmedBy: string; confirmedAt: string };
  };
  assert.equal(capture.consent?.confirmedBy, 'user_admin');
  assert.ok(Date.parse(capture.consent?.confirmedAt ?? '') > 0);
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
  await execute(backend, 'POST', `captures/${target.uploadId}/uploaded`);
  assert.deepEqual(queued, [
    {
      url: 'https://app.example/api/v1/internal/media',
      job: { objectPath: `quarantine/tenant_a/${id}/${target.uploadId}` },
      taskId: `media-${target.uploadId}`,
    },
  ]);
});
test('a recording the worker has taken is not queued again', async () => {
  const { backend, objects, queued, worker } = await mediaHarness();
  const id = await draft(backend);
  const target = (await execute(backend, 'POST', `processes/${id}/uploads`, audio)) as {
    uploadId: string;
  };
  const objectPath = `quarantine/tenant_a/${id}/${target.uploadId}`;
  objects.set(objectPath, new Uint8Array([1]));
  await worker.process({ objectPath }, true).catch(() => undefined);
  await execute(backend, 'POST', `captures/${target.uploadId}/uploaded`);
  assert.equal(queued.length, 0);
});
test('the media worker URL sits beside the analysis worker', () => {
  assert.equal(
    mediaWorkerUrl({
      queue: 'projects/p/locations/r/queues/q',
      workerUrl: 'https://app.run.app/api/v1/internal/analysis',
      invokerEmail: 'tasks@p.iam.gserviceaccount.com',
    }),
    'https://app.run.app/api/v1/internal/media',
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mp4 } from '../support/media-fixtures';
import {
  actor,
  execute,
  mediaHarness,
  transcribed,
  type MediaHarness,
} from '../support/media-harness';

type MediaLinks = {
  video?: { captureId: string; url: string; contentType: string };
  frames: Record<string, string>;
};
async function framed(h: MediaHarness) {
  const draft = await transcribed(h);
  await execute(h.backend, 'POST', `processes/${draft.processId}/frames`, {
    captureId: draft.captureId,
    stepId: draft.steps[0].id,
    atMs: 2500,
    bytes: 50_000,
  });
  const process = (await execute(h.backend, 'GET', `processes/${draft.processId}`)) as {
    versions: {
      steps: { id: string; action: string; source: string; frameObjectPath?: string }[];
    }[];
  };
  return { ...draft, steps: process.versions[0].steps };
}
const links = (h: MediaHarness, processId: string, who = actor()) =>
  execute(h.backend, 'GET', `processes/${processId}/media`, {}, who) as Promise<MediaLinks>;

test("a draft's media links sign its frames and its checked recording for reading", async () => {
  const h = await mediaHarness();
  const { processId, captureId, objectPath, steps } = await framed(h);
  const media = await links(h, processId);
  const framePath = steps[0].frameObjectPath!;
  assert.deepEqual(media.frames, {
    [steps[0].id]: `https://storage.example/${framePath}?read=1`,
  });
  const clean = objectPath.replace(/^quarantine\//, 'clean/');
  assert.deepEqual(media.video, {
    captureId,
    url: `https://storage.example/${clean}?read=1`,
    contentType: 'audio/webm',
  });
  assert.deepEqual(h.reads, [
    { objectPath: framePath, contentType: 'image/jpeg' },
    { objectPath: clean, contentType: 'audio/webm' },
  ]);
});
test('the latest transcribed video is the one offered for picking frames', async () => {
  const h = await mediaHarness();
  const { processId } = await transcribed(h);
  const later = (await execute(h.backend, 'POST', `processes/${processId}/uploads`, {
    expertReference: 'expert_1',
    contentType: 'video/mp4',
    bytes: 100,
    consent: true,
  })) as { uploadId: string };
  const objectPath = `quarantine/tenant_a/${processId}/${later.uploadId}`;
  h.objects.set(objectPath, mp4(20));
  await h.worker.process({ objectPath }, true);
  const media = await links(h, processId);
  assert.equal(media.video?.captureId, later.uploadId);
  assert.equal(media.video?.contentType, 'video/mp4');
});
test("another tenant's media links are not found and nothing is signed", async () => {
  const h = await mediaHarness();
  const { processId } = await framed(h);
  await assert.rejects(links(h, processId, actor('tenant_b')), /not found/);
  assert.deepEqual(h.reads, []);
});

const publish = (h: MediaHarness, processId: string, steps: unknown[]) =>
  execute(h.backend, 'POST', `processes/${processId}/publish`, {
    steps,
    approved: true,
  }) as Promise<{
    currentVersion: number;
    versions: { steps: { id: string; frameObjectPath?: string }[] }[];
  }>;

test('publishing copies each step image out of expiring storage and points the step at it', async () => {
  const h = await mediaHarness();
  const { processId, steps } = await framed(h);
  const draftFrame = steps[0].frameObjectPath!;
  h.objects.set(draftFrame, new Uint8Array([0xff, 0xd8]));
  const published = await publish(h, processId, steps);
  const kept = `published/tenant_a/${processId}/v1/${steps[0].id}`;
  assert.deepEqual(h.copies, [{ from: draftFrame, to: kept }]);
  assert.equal(published.versions[0].steps[0].frameObjectPath, kept);
  assert.equal(published.versions[0].steps[1].frameObjectPath, undefined);
  const media = await links(h, processId);
  assert.deepEqual(media.frames, { [steps[0].id]: `https://storage.example/${kept}?read=1` });
  assert.equal(media.video, undefined);
});
test('a step image that cannot be kept stops publication and leaves the draft as it was', async () => {
  const h = await mediaHarness();
  const { processId, steps } = await framed(h);
  await assert.rejects(publish(h, processId, steps));
  const process = (await execute(h.backend, 'GET', `processes/${processId}`)) as {
    currentVersion: number;
    versions: { steps: { frameObjectPath?: string }[] }[];
  };
  assert.equal(process.currentVersion, 0);
  assert.equal(process.versions[0].steps[0].frameObjectPath, steps[0].frameObjectPath);
});

test('saving a draft can drop a step image or move it onto a merged step, never invent one', async () => {
  const h = await mediaHarness();
  const { processId, steps } = await framed(h);
  const image = steps[0].frameObjectPath;
  const save = async (next: unknown[]) =>
    (
      (await execute(h.backend, 'POST', `processes/${processId}/draft`, { steps: next })) as {
        versions: { steps: { frameObjectPath?: string }[] }[];
      }
    ).versions[0].steps.map((s) => s.frameObjectPath);
  const moved = [
    { ...steps[1], frameObjectPath: image },
    { ...steps[0], frameObjectPath: 'clean/tenant_b/secret.jpg' },
  ];
  assert.deepEqual(await save(moved), [image, undefined]);
  const withoutImages = [steps[1], steps[0]].map((step) => ({
    ...step,
    frameObjectPath: undefined,
  }));
  assert.deepEqual(await save(withoutImages), [undefined, undefined]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addStep, stepsMissingPictures } from '../../src/lib/domain/steps';
import type { ProcessStep } from '../../src/lib/domain/types';
import { execute, mediaHarness, transcribed, type MediaHarness } from '../support/media-harness';

type Draft = { versions: { steps: ProcessStep[] }[] };
const draftSteps = async (h: MediaHarness, processId: string) =>
  ((await execute(h.backend, 'GET', `processes/${processId}`)) as Draft).versions[0].steps;
const publish = (h: MediaHarness, processId: string, steps: ProcessStep[]) =>
  execute(h.backend, 'POST', `processes/${processId}/publish`, { steps });

test('a draft publishes only when every step has a picture or is marked as needing none', async () => {
  const h = await mediaHarness();
  const { processId, captureId } = await transcribed(h);
  const steps = await draftSteps(h, processId);
  await assert.rejects(publish(h, processId, steps), {
    message: 'Add pictures to steps 1 and 2, or mark them as needing none.',
  });

  await execute(h.backend, 'POST', `processes/${processId}/frames`, {
    captureId,
    stepId: steps[0].id,
    atMs: 2500,
    bytes: 50_000,
  });
  const framed = await draftSteps(h, processId);
  h.objects.set(framed[0].frameObjectPath!, new Uint8Array([0xff, 0xd8]));
  await assert.rejects(publish(h, processId, framed), {
    message: 'Add a picture to step 2, or mark it as needing none.',
  });

  const waived = framed.map((step, i) => (i ? { ...step, imageWaived: true } : step));
  const published = (await publish(h, processId, waived)) as Draft;
  assert.equal(published.versions[0].steps[1].imageWaived, true);
});

test('marking a step as needing no picture survives saving the draft', async () => {
  const h = await mediaHarness();
  const { processId } = await transcribed(h);
  const steps = await draftSteps(h, processId);
  await execute(h.backend, 'POST', `processes/${processId}/draft`, {
    steps: steps.map((step) => ({ ...step, imageWaived: true })),
  });
  assert.ok((await draftSteps(h, processId)).every((step) => step.imageWaived));
});

test('a text walkthrough step can take a photo, which has no moment in a recording', async () => {
  const h = await mediaHarness();
  const { id: processId } = (await execute(h.backend, 'POST', 'processes', {
    title: 'Brake bleed',
    equipment: 'Van',
  })) as { id: string };
  const { id: captureId } = (await execute(h.backend, 'POST', `processes/${processId}/captures`, {
    kind: 'text',
    expertReference: 'expert_1',
    text: 'Open the bleed valve.',
  })) as { id: string };
  const step: ProcessStep = {
    id: 'step_1',
    sequence: 1,
    action: 'Open the bleed valve',
    required: true,
    source: 'expert_walkthrough',
  };
  await execute(h.backend, 'POST', `processes/${processId}/draft`, { steps: [step] });
  const photo = { captureId, stepId: step.id, bytes: 50_000 };
  await assert.rejects(
    execute(h.backend, 'POST', `processes/${processId}/frames`, { ...photo, atMs: 1000 }),
    /outside the recording/,
  );
  await execute(h.backend, 'POST', `processes/${processId}/frames`, { ...photo, atMs: 0 });
  assert.equal(stepsMissingPictures(await draftSteps(h, processId)).length, 0);
});

test('a step added to a recorded draft gets a picture moment between the last step and the end', () => {
  const last = { id: 'a', sequence: 1, action: 'A', required: true, frameAtMs: 4000 } as const;
  const steps = [{ ...last, source: 'expert_walkthrough' as const }];
  assert.equal(addStep(steps, 'b', 10_000)[1].frameAtMs, 7000);
  assert.equal(addStep(steps, 'b')[1].frameAtMs, undefined);
});

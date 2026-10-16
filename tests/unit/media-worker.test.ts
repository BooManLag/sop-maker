import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mp4, webm } from '../support/media-fixtures';
import {
  execute,
  mediaHarness,
  recordingRequest,
  transcribed,
  transcript,
  uploaded,
  type MediaHarness,
} from '../support/media-harness';
test('clean audio becomes draft steps with suggested frame times and timed segments', async () => {
  const h = await mediaHarness();
  const { processId, captureId, objectPath } = await uploaded(h);
  await h.worker.process({ objectPath }, true);
  const process = (await execute(h.backend, 'GET', `processes/${processId}`)) as {
    versions: { steps: { action: string; frameAtMs?: number; source: string }[] }[];
  };
  assert.deepEqual(
    process.versions[0].steps.map(({ action, frameAtMs, source }) => ({
      action,
      frameAtMs,
      source,
    })),
    [
      { action: 'Isolate the pump at the breaker', frameAtMs: 2500, source: 'expert_walkthrough' },
      { action: 'Open the drain valve slowly', frameAtMs: 6000, source: 'expert_walkthrough' },
    ],
  );
  const capture = (await execute(h.backend, 'GET', `captures/${captureId}`)) as {
    segments: { startMs: number; text: string }[];
    status: string;
  };
  assert.equal(capture.status, 'transcribed');
  assert.deepEqual(
    capture.segments.map((s) => s.startMs),
    [0, 4000],
  );
  assert.deepEqual(h.transcribed, [objectPath.replace(/^quarantine\//, 'clean/')]);
  assert.equal(h.objects.has(objectPath), false);
});
test('a recording that fails inspection is rejected, deleted and never transcribed', async () => {
  const h = await mediaHarness();
  const { captureId, objectPath } = await uploaded(h, mp4(5));
  await h.worker.process({ objectPath }, true);
  const capture = (await execute(h.backend, 'GET', `captures/${captureId}`)) as {
    status: string;
    rejection: string;
  };
  assert.equal(capture.status, 'rejected');
  assert.match(capture.rejection, /do not match/);
  assert.equal(h.objects.size, 0);
  assert.deepEqual(h.transcribed, []);
});
test('invalid model output saves nothing; the final attempt marks the capture failed', async () => {
  const h = await mediaHarness({
    ...transcript,
    steps: [{ action: '', frameAtMs: 999_999_999 }],
  });
  const { processId, captureId, objectPath } = await uploaded(h);
  await assert.rejects(h.worker.process({ objectPath }, false), /invalid/);
  const status = async () =>
    ((await execute(h.backend, 'GET', `captures/${captureId}`)) as { status: string }).status;
  assert.equal(await status(), 'awaiting_upload');
  await h.worker.process({ objectPath }, true);
  assert.equal(await status(), 'failed');
  const process = (await execute(h.backend, 'GET', `processes/${processId}`)) as {
    versions: { steps: unknown[] }[];
  };
  assert.deepEqual(process.versions[0].steps, []);
});
test('identical audio from the same tenant reuses the earlier transcript', async () => {
  const h = await mediaHarness();
  const first = await uploaded(h);
  await h.worker.process({ objectPath: first.objectPath }, true);
  const second = await uploaded(h);
  await h.worker.process({ objectPath: second.objectPath }, true);
  assert.equal(h.transcribed.length, 1);
  const capture = (await execute(h.backend, 'GET', `captures/${second.captureId}`)) as {
    status: string;
    segments: unknown[];
  };
  assert.equal(capture.status, 'transcribed');
  assert.equal(capture.segments.length, 2);
  const process = (await execute(h.backend, 'GET', `processes/${second.processId}`)) as {
    versions: { steps: { frameAtMs?: number }[] }[];
  };
  assert.deepEqual(
    process.versions[0].steps.map((s) => s.frameAtMs),
    [2500, 6000],
  );
});
test('retention purges an expired recording transcript', async () => {
  const h = await mediaHarness();
  const { captureId, objectPath } = await uploaded(h);
  await h.worker.process({ objectPath }, true);
  await h.repositories.forTenant('tenant_a').transact((s) => {
    s.captures.find((c) => c.id === captureId)!.expiresAt = new Date(0).toISOString();
  });
  const purged = (await execute(h.backend, 'POST', 'maintenance/retention')) as {
    capturesPurged: number;
  };
  assert.equal(purged.capturesPurged, 1);
  const s = await h.repositories.forTenant('tenant_a').read();
  const capture = s.captures.find((c) => c.id === captureId)!;
  assert.equal(capture.segments, undefined);
  assert.equal(capture.suggestedSteps, undefined);
  assert.equal(capture.media?.sha256, undefined);
});
test('the transcriber gets the length the worker measured from a video', async () => {
  const h = await mediaHarness();
  const { captureId, objectPath } = await uploaded(h, mp4(42), 'video/mp4');
  await h.worker.process({ objectPath }, true);
  assert.deepEqual(h.durations, [42]);
  const capture = (await execute(h.backend, 'GET', `captures/${captureId}`)) as {
    durationMs: number;
  };
  assert.equal(capture.durationMs, 42_000);
});
test('a recording longer than the model can transcribe is rejected with a clear reason', async () => {
  const h = await mediaHarness();
  const { captureId, objectPath } = await uploaded(h, mp4(45 * 60 + 1), 'video/mp4');
  await h.worker.process({ objectPath }, true);
  const capture = (await execute(h.backend, 'GET', `captures/${captureId}`)) as {
    status: string;
    rejection: string;
  };
  assert.equal(capture.status, 'rejected');
  assert.match(capture.rejection, /too long to process/);
  assert.deepEqual(h.transcribed, []);
});
test('measured minutes are charged; once 300 are spent recordings and uploads are refused', async () => {
  const h = await mediaHarness({ ...transcript, audioSeconds: 45 * 60 });
  const statuses = [];
  // Six 45-minute recordings spend 270 minutes; a seventh would pass 300.
  for (let i = 0; i < 7; i++) {
    const { captureId, objectPath } = await uploaded(h, mp4(45 * 60, 1000 + i), 'video/mp4');
    await h.worker.process({ objectPath }, true);
    const capture = (await execute(h.backend, 'GET', `captures/${captureId}`)) as {
      status: string;
      rejection?: string;
    };
    statuses.push(capture.rejection ?? capture.status);
  }
  assert.deepEqual(statuses.slice(0, 6), Array(6).fill('transcribed'));
  assert.match(statuses[6], /monthly recording allowance/);
  const last = await uploaded(h, mp4(30 * 60), 'video/mp4');
  await h.worker.process({ objectPath: last.objectPath }, true);
  await assert.rejects(uploaded(h), (error: { status?: number }) => error.status === 429);
});
test("the expert's chosen frame is linked to its step through a signed image upload", async () => {
  const h = await mediaHarness();
  const { processId, captureId, steps } = await transcribed(h);
  const target = (await execute(h.backend, 'POST', `processes/${processId}/frames`, {
    captureId,
    stepId: steps[1].id,
    atMs: 7000,
    bytes: 120_000,
  })) as { url: string; headers: Record<string, string> };
  assert.equal(target.headers['content-type'], 'image/jpeg');
  assert.equal(target.headers['x-goog-content-length-range'], '0,120000');
  const process = (await execute(h.backend, 'GET', `processes/${processId}`)) as {
    versions: { steps: { frameAtMs?: number; frameObjectPath?: string }[] }[];
  };
  const step = process.versions[0].steps[1];
  assert.equal(step.frameAtMs, 7000);
  assert.match(step.frameObjectPath ?? '', new RegExp(`^quarantine/tenant_a/${processId}/frames/`));
  assert.match(target.url, new RegExp(step.frameObjectPath!));
});
test('a frame outside the recording, or for another process, is refused', async () => {
  const h = await mediaHarness();
  const { processId, captureId, steps } = await transcribed(h);
  await assert.rejects(
    execute(h.backend, 'POST', `processes/${processId}/frames`, {
      captureId,
      stepId: steps[0].id,
      atMs: 10_001,
      bytes: 1000,
    }),
    /outside the recording/,
  );
  const other = await transcribed(h);
  await assert.rejects(
    execute(h.backend, 'POST', `processes/${other.processId}/frames`, {
      captureId,
      stepId: other.steps[0].id,
      atMs: 1000,
      bytes: 1000,
    }),
    /not found/,
  );
});
test('publishing cannot point a step at an object outside the draft', async () => {
  const h = await mediaHarness();
  const { processId, captureId, steps } = await transcribed(h);
  await execute(h.backend, 'POST', `processes/${processId}/frames`, {
    captureId,
    stepId: steps[0].id,
    atMs: 1000,
    bytes: 1000,
  });
  const stored = async () =>
    (
      (await execute(h.backend, 'GET', `processes/${processId}`)) as {
        versions: { steps: (Record<string, unknown> & { frameObjectPath?: string })[] }[];
      }
    ).versions[0].steps;
  const linked = (await stored())[0].frameObjectPath;
  const forged = (await stored()).map(({ frameObjectPath: _, ...step }) => ({
    ...step,
    frameObjectPath: 'clean/tenant_b/secret.jpg',
  }));
  h.objects.set(linked!, new Uint8Array([0xff, 0xd8]));
  await execute(h.backend, 'POST', `processes/${processId}/publish`, {
    approved: true,
    steps: forged,
  });
  assert.deepEqual(
    (await stored()).map((s) => s.frameObjectPath),
    [undefined, undefined],
  );
  assert.ok(h.copies.every((copy) => copy.from === linked));
});
test('a worker that crashes after leaving quarantine finishes on redelivery', async () => {
  const h = await mediaHarness();
  const { captureId, objectPath } = await uploaded(h);
  h.faults.crashAfterPromote = true;
  await assert.rejects(h.worker.process({ objectPath }, false), /crashed/);
  await h.worker.process({ objectPath }, true);
  const capture = (await execute(h.backend, 'GET', `captures/${captureId}`)) as { status: string };
  assert.equal(capture.status, 'transcribed');
});
test('a recording never overwrites steps already in the draft; they stay as suggestions', async () => {
  const h = await mediaHarness();
  const { processId, steps } = await transcribed(h);
  const edited = steps.map((s) => ({ ...s, action: `${s.action} (checked)` }));
  await execute(h.backend, 'POST', `processes/${processId}/draft`, { steps: edited });
  const target = (await execute(
    h.backend,
    'POST',
    `processes/${processId}/uploads`,
    recordingRequest(),
  )) as { uploadId: string };
  const objectPath = `quarantine/tenant_a/${processId}/${target.uploadId}`;
  h.objects.set(objectPath, webm(0, 10_000));
  await h.worker.process({ objectPath }, true);
  const process = (await execute(h.backend, 'GET', `processes/${processId}`)) as {
    versions: { steps: { action: string }[] }[];
  };
  assert.deepEqual(
    process.versions[0].steps.map((s) => s.action),
    edited.map((s) => s.action),
  );
  const capture = (await execute(h.backend, 'GET', `captures/${target.uploadId}`)) as {
    status: string;
  };
  assert.equal(capture.status, 'transcribed');
});
const outcomes = {
  rejected: async (h: MediaHarness) => {
    const u = await uploaded(h, mp4(5));
    await h.worker.process({ objectPath: u.objectPath }, true);
    return u.processId;
  },
  failed: async (h: MediaHarness) => {
    const u = await uploaded(h);
    await h.worker.process({ objectPath: u.objectPath }, true);
    return u.processId;
  },
  reused: async (h: MediaHarness) => {
    const first = await uploaded(h);
    await h.worker.process({ objectPath: first.objectPath }, true);
    const second = await uploaded(h);
    await h.worker.process({ objectPath: second.objectPath }, true);
    return second.processId;
  },
};
const spentMediaSeconds = async (h: MediaHarness) =>
  (await h.repositories.forTenant('tenant_a').read()).quotas.find(
    (q) => q.key === 'media:tenant:seconds',
  )?.count ?? 0;
for (const [outcome, run] of Object.entries(outcomes))
  test(`a ${outcome} recording is charged only for audio actually billed`, async () => {
    const h = await mediaHarness(outcome === 'failed' ? { steps: [] } : transcript);
    await run(h);
    // Rejected audio costs nothing; a failed call keeps its measured 10s; reuse bills only the first (9s).
    const kept = { rejected: 0, failed: 10, reused: 9 }[outcome as keyof typeof outcomes];
    assert.equal(await spentMediaSeconds(h), kept);
  });
const disordered = {
  'a segment that ends before it starts': [{ startMs: 4000, endMs: 1000, text: 'Backwards.' }],
  'segments out of order': [
    { startMs: 4000, endMs: 9000, text: 'Second.' },
    { startMs: 0, endMs: 4000, text: 'First.' },
  ],
};
for (const [name, segments] of Object.entries(disordered))
  test(`model output with ${name} is invalid`, async () => {
    const h = await mediaHarness({ ...transcript, segments });
    const { captureId, objectPath } = await uploaded(h);
    await h.worker.process({ objectPath }, true);
    const capture = (await execute(h.backend, 'GET', `captures/${captureId}`)) as {
      status: string;
    };
    assert.equal(capture.status, 'failed');
  });

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Backend } from '../../src/lib/application/backend';
import { JsonRepositoryProvider } from '../../src/lib/infrastructure/json-repository';
import { GuardedCaptureAdapter } from '../../src/lib/server/ai';
import { DemoGeminiAdapter } from '../../src/lib/services';
import type { ServerConfig } from '../../src/lib/server/config';
import type { Actor } from '../../src/lib/server/auth';
import { resolveEndpoint } from '../../src/lib/server/contracts';
import type { ProcessStep } from '../../src/lib/domain/types';

const expert: Actor = {
  userId: 'user_expert',
  organizationId: 'tenant_a',
  role: 'admin',
  authTime: Math.floor(Date.now() / 1000),
  mfa: true,
  demo: false,
};

async function createBackend() {
  const directory = await mkdtemp(path.join(tmpdir(), 'ge-draft-'));
  const config: ServerConfig = {
    mode: 'production',
    dataDir: directory,
    allowedOrigins: ['https://app.example.com'],
    projectId: 'demo-good-exception',
    databaseId: '(default)',
    requireMfa: true,
    emulator: true,
    pseudonymKey: 'local-test-only-key-'.repeat(3),
  };
  return new Backend(
    new JsonRepositoryProvider(directory),
    config,
    new GuardedCaptureAdapter(new DemoGeminiAdapter()),
  );
}

function call<T>(backend: Backend, method: string, url: string, body: unknown = {}) {
  const { endpoint, id } = resolveEndpoint(method, url.split('/'));
  return backend.execute(endpoint, id, body, {
    actor: expert,
    requestId: randomUUID(),
    idempotencyKey: randomUUID(),
  }) as Promise<T>;
}

async function analyzedDraft(backend: Backend) {
  const process = await call<{ id: string }>(backend, 'POST', 'processes', {
    title: 'Valve Replacement',
    equipment: 'Valve assembly X',
  });
  const capture = await call<{ id: string }>(backend, 'POST', `processes/${process.id}/captures`, {
    kind: 'text',
    expertReference: 'expert_01',
    text: 'Isolate supply. Replace valve. Test pressure. Wait 3 minutes. Test pressure again.',
  });
  const extraction = await call<{ steps: ProcessStep[]; questions: string[] }>(
    backend,
    'POST',
    `processes/${process.id}/analyze-capture`,
    { captureId: capture.id },
  );
  return { processId: process.id, captureId: capture.id, ...extraction };
}

interface DraftCapture {
  id: string;
  questions: string[];
  answers: { question: string; answer: string }[];
}

test('a draft capture can be resumed with its questions and answers so far', async () => {
  const backend = await createBackend();
  const draft = await analyzedDraft(backend);
  const capturePath = `captures/${draft.captureId}`;

  const fresh = await call<DraftCapture>(backend, 'GET', capturePath);
  assert.deepEqual(fresh.questions, draft.questions);
  assert.deepEqual(fresh.answers, []);

  await call(backend, 'POST', `processes/${draft.processId}/clarifications`, {
    captureId: draft.captureId,
    stepId: draft.steps[0].id,
    question: draft.questions[0],
    answer: 'Pressure drifts while the assembly settles.',
  });
  const resumed = await call<DraftCapture>(backend, 'GET', capturePath);
  assert.deepEqual(resumed.answers, [
    { question: draft.questions[0], answer: 'Pressure drifts while the assembly settles.' },
  ]);
});

test('edited draft steps are saved and survive a reload until the baseline is published', async () => {
  const backend = await createBackend();
  const draft = await analyzedDraft(backend);
  const edited = [
    { ...draft.steps[1], sequence: 1, rationale: 'Shut off before touching the valve.' },
    { ...draft.steps[0], sequence: 2 },
  ];

  await call(backend, 'POST', `processes/${draft.processId}/draft`, { steps: edited });
  const reloaded = await call<{ versions: { steps: ProcessStep[] }[] }>(
    backend,
    'GET',
    `processes/${draft.processId}`,
  );
  assert.deepEqual(reloaded.versions[0].steps, edited);

  await call(backend, 'POST', `processes/${draft.processId}/publish`, {
    steps: edited,
    approved: true,
  });
  await assert.rejects(
    call(backend, 'POST', `processes/${draft.processId}/draft`, { steps: edited }),
    /already published/,
  );
});

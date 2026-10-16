import { QueuedMediaJobs } from '../../src/lib/server/media-jobs';
import type { TaskQueue } from '../../src/lib/server/cloud-tasks';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { wholeFile } from './media-fixtures';
import { Backend } from '../../src/lib/application/backend';
import type { MediaStorage, MediaTranscriber, UploadSigner } from '../../src/lib/application/ports';
import { MediaWorker } from '../../src/lib/application/media-worker';
import { JsonRepositoryProvider } from '../../src/lib/infrastructure/json-repository';
import { GuardedCaptureAdapter } from '../../src/lib/server/ai';
import { DemoGeminiAdapter } from '../../src/lib/infrastructure/demo-capture-adapter';
import type { ServerConfig } from '../../src/lib/server/config';
import type { Actor } from '../../src/lib/server/auth';
import { resolveEndpoint } from '../../src/lib/server/contracts';
export const actor = (organizationId = 'tenant_a'): Actor => ({
  userId: 'user_admin',
  organizationId,
  role: 'admin',
  authTime: Math.floor(Date.now() / 1000),
  mfa: true,
  demo: false,
});
export const transcript = {
  segments: [
    { startMs: 0, endMs: 4000, text: 'Isolate the pump at the breaker.' },
    { startMs: 4000, endMs: 9000, text: 'Then open the drain valve slowly.' },
  ],
  steps: [
    { action: 'Isolate the pump at the breaker', frameAtMs: 2500 },
    { action: 'Open the drain valve slowly', frameAtMs: 6000 },
  ],
  audioSeconds: 9,
};
/** A valid upload request body; tests override only what they exercise. */
export const recordingRequest = (overrides: Record<string, unknown> = {}) => ({
  expertReference: 'expert_1',
  contentType: 'audio/webm',
  bytes: 1000,
  consent: true,
  ...overrides,
});
/** Backend and media worker over a temp JSON store, with in-memory storage and model fakes. */
export async function mediaHarness(output: unknown = transcript) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ge-media-'));
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
  const objects = new Map<string, Uint8Array>();
  const faults = { crashAfterPromote: false };
  const storage: MediaStorage = {
    async exists(objectPath) {
      return objects.has(objectPath);
    },
    async open(objectPath) {
      const bytes = objects.get(objectPath);
      if (!bytes) throw new Error('missing object');
      return wholeFile(bytes);
    },
    async sha256(objectPath) {
      const bytes = objects.get(objectPath);
      if (!bytes) throw new Error('missing object');
      return createHash('sha256').update(bytes).digest('hex');
    },
    async promote(from, to) {
      if (objects.has(from)) {
        objects.set(to, objects.get(from)!);
        objects.delete(from);
      } else if (!objects.has(to)) throw new Error('missing object');
      if (faults.crashAfterPromote) {
        faults.crashAfterPromote = false;
        throw new Error('worker crashed');
      }
    },
    async remove(objectPath) {
      objects.delete(objectPath);
    },
  };
  const transcribed: string[] = [];
  const durations: (number | undefined)[] = [];
  const transcriber: MediaTranscriber = {
    async transcribe(objectPath, _contentType, options) {
      transcribed.push(objectPath);
      durations.push(options?.durationSeconds);
      return structuredClone(output) as Awaited<ReturnType<MediaTranscriber['transcribe']>>;
    },
  };
  const signed: Parameters<UploadSigner['sign']>[0][] = [];
  const queued: { url: string; job: object; taskId?: string }[] = [];
  const jobs = new QueuedMediaJobs(
    storage,
    {
      async post(url: string, job: object, taskId?: string) {
        // Cloud Tasks refuses a second task with the same name.
        if (!queued.some((task) => taskId && task.taskId === taskId))
          queued.push({ url, job, taskId });
      },
    } satisfies TaskQueue,
    'https://app.example/api/v1/internal/media',
  );
  const repositories = new JsonRepositoryProvider(directory);
  const backend = new Backend(
    repositories,
    config,
    new GuardedCaptureAdapter(new DemoGeminiAdapter()),
    undefined,
    {
      async sign(request) {
        signed.push(request);
        return { url: `https://storage.example/${request.objectPath}?sig=1` };
      },
    },
    jobs,
  );
  const worker = new MediaWorker(repositories, storage, transcriber, () => undefined);
  return { backend, worker, objects, transcribed, durations, repositories, faults, signed, queued };
}
export type MediaHarness = Awaited<ReturnType<typeof mediaHarness>>;
export async function execute(
  backend: Backend,
  method: string,
  url: string,
  body: unknown = {},
  who = actor(),
) {
  const { endpoint, id } = resolveEndpoint(method, url.split('/'));
  return backend.execute(endpoint, id, body, {
    actor: who,
    requestId: randomUUID(),
    idempotencyKey: randomUUID(),
  });
}

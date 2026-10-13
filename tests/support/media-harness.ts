import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
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
    async read(objectPath) {
      const bytes = objects.get(objectPath);
      if (!bytes) throw new Error('missing object');
      return bytes;
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
  const transcriber: MediaTranscriber = {
    async transcribe(objectPath) {
      transcribed.push(objectPath);
      return structuredClone(output) as Awaited<ReturnType<MediaTranscriber['transcribe']>>;
    },
  };
  const signed: Parameters<UploadSigner['sign']>[0][] = [];
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
  );
  const worker = new MediaWorker(repositories, storage, transcriber, () => undefined);
  return { backend, worker, objects, transcribed, repositories, faults, signed };
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

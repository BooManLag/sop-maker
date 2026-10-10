import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Backend } from '../lib/application/backend';
import { JsonRepositoryProvider } from '../lib/infrastructure/json-repository';
import { initialStore } from '../lib/application/store';
import { GuardedCaptureAdapter, UnavailableCaptureAdapter } from '../lib/server/ai';
import { createHttpHandler } from '../lib/server/http';
import { Observability } from '../lib/server/observability';
import type { ServerConfig } from '../lib/server/config';
async function main() {
  const directory = await mkdtemp(path.join(tmpdir(), 'ge-load-'));
  const repositories = new JsonRepositoryProvider(directory);
  const config: ServerConfig = {
    mode: 'production',
    dataDir: directory,
    allowedOrigins: ['https://load.example.test'],
    databaseId: '(default)',
    requireMfa: false,
    emulator: true,
    pseudonymKey: 'load-test-only-secret-'.repeat(2),
  };
  await repositories.forTenant('load_test').transact((s) => {
    const baseline = initialStore().processes[0];
    for (let i = 0; i < 100; i++)
      s.processes.push({
        ...structuredClone(baseline),
        id: `process_${i}`,
        organizationId: 'load_test',
        versions: baseline.versions.map((v) => ({
          ...structuredClone(v),
          id: `version_${i}`,
          processId: `process_${i}`,
        })),
      });
  });
  const handler = createHttpHandler({
    backend: new Backend(
      repositories,
      config,
      new GuardedCaptureAdapter(new UnavailableCaptureAdapter()),
    ),
    config,
    verifier: {
      verify: async (token) => ({
        uid: token,
        organizationId: 'load_test',
        role: 'viewer',
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    },
    observability: new Observability(() => {}),
  });
  const times: number[] = [];
  const statuses: Record<string, number> = {};
  let next = 0;
  const total = 400;
  const started = performance.now();
  await Promise.all(
    Array.from({ length: 16 }, async (_, worker) => {
      while (next++ < total) {
        const before = performance.now();
        const response = await handler(
          new Request('https://load.example.test/api/workspace', {
            headers: { authorization: `Bearer load_user_${worker}_${'x'.repeat(20)}` },
          }),
          ['workspace'],
        );
        times.push(performance.now() - before);
        statuses[response.status] = (statuses[response.status] ?? 0) + 1;
        if (response.status === 200) {
          const body = (await response.json()) as { processes: unknown[] };
          if (body.processes.length !== 50)
            throw new Error('Response pagination bound was not applied.');
        }
      }
    }),
  );
  times.sort((a, b) => a - b);
  const percentile = (p: number) => Math.round(times[Math.floor(times.length * p)] * 100) / 100;
  const report = {
    date: new Date().toISOString(),
    revision: process.env.GITHUB_SHA ?? 'working-tree',
    scope:
      'Local application/HTTP handler + JSON disk reads; excludes network transport, Firestore and production autoscaling',
    tenantProcesses: 100,
    requests: total,
    concurrency: 16,
    statuses,
    durationMs: Math.round(performance.now() - started),
    latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) },
    rssBytes: process.memoryUsage().rss,
    target: { p95Ms: 500, errors: 0 },
    pass: statuses['200'] === total && percentile(0.95) < 500,
  };
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/local-load.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

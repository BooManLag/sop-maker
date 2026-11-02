import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Backend } from '../../src/lib/application/backend';
import {
  JsonRepository,
  JsonRepositoryProvider,
} from '../../src/lib/infrastructure/json-repository';
import { GuardedCaptureAdapter } from '../../src/lib/server/ai';
import { DemoGeminiAdapter } from '../../src/lib/infrastructure/demo-capture-adapter';
import { normalizeRecords } from '../../src/lib/application/evidence-engine';
import { readConfig, type ServerConfig } from '../../src/lib/server/config';
import { demoActor, type Actor } from '../../src/lib/server/auth';
import { resolveEndpoint } from '../../src/lib/server/contracts';
import {
  AUDIT_EVENTS_PER_COMMIT,
  initialStore,
  takeAuditEvents,
} from '../../src/lib/application/store';
import { demoFindings, demoProcess } from '../../src/lib/domain/demo-data';
import type { AnalysisQueue } from '../../src/lib/application/analysis/worker';
const actor = (organizationId = 'tenant_a', role: Actor['role'] = 'admin'): Actor => ({
  userId: `user_${role}`,
  organizationId,
  role,
  authTime: Math.floor(Date.now() / 1000),
  mfa: true,
  demo: false,
});
async function harness(analysis?: AnalysisQueue) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ge-backend-'));
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
  const repositories = new JsonRepositoryProvider(directory);
  const backend = new Backend(
    repositories,
    config,
    new GuardedCaptureAdapter(new DemoGeminiAdapter()),
    analysis,
  );
  return { backend, repositories, directory, config };
}
async function execute(
  backend: Backend,
  method: string,
  url: string,
  body: unknown = {},
  who = actor(),
  key = randomUUID(),
) {
  const { endpoint, id } = resolveEndpoint(method, url.split('/'));
  return backend.execute(endpoint, id, body, {
    actor: who,
    requestId: randomUUID(),
    idempotencyKey: key,
  });
}
const asId = (value: unknown) => value as { id: string };
test('strict schemas reject role injection, extra paths, malformed steps and unbounded rows', async () => {
  const { backend } = await harness();
  await assert.rejects(
    execute(backend, 'POST', 'processes', { title: 'A', equipment: 'B', role: 'admin' }),
    /Unrecognized/,
  );
  await assert.rejects(
    execute(backend, 'POST', 'processes', {
      title: 'A',
      equipment: 'B',
      organizationId: 'tenant_b',
    }),
    /Unrecognized/,
  );
  assert.throws(() => resolveEndpoint('GET', ['processes', 'abc', 'extra']), /not found/);
  const p = asId(await execute(backend, 'POST', 'processes', { title: 'A', equipment: 'B' }));
  await assert.rejects(
    execute(backend, 'POST', `processes/${p.id}/publish`, {
      approved: true,
      steps: [
        {
          id: 'x',
          action: 'do',
          sequence: 1,
          required: true,
          source: 'baseline',
          durationMinSeconds: 5,
          durationMaxSeconds: 1,
        },
      ],
    }),
    /duration/,
  );
  await assert.rejects(
    execute(backend, 'POST', 'scans', {
      processId: p.id,
      rows: Array.from({ length: 1001 }, (_, i) => ({ job_id: String(i) })),
    }),
    /1000/,
  );
});
test('tenant and object isolation covers reads, parent references, and workspace', async () => {
  const { backend } = await harness();
  const p = asId(
    await execute(backend, 'POST', 'processes', { title: 'Tenant A procedure', equipment: 'X' }),
  );
  await assert.rejects(
    execute(backend, 'GET', `processes/${p.id}`, {}, actor('tenant_b')),
    /not found/,
  );
  await assert.rejects(
    execute(
      backend,
      'POST',
      `processes/${p.id}/captures`,
      { kind: 'text', expertReference: 'expert_1', text: 'one step' },
      actor('tenant_b'),
    ),
    /not found/,
  );
  const result = (await execute(backend, 'GET', 'workspace', {}, actor('tenant_b'))) as {
    processes: unknown[];
  };
  assert.equal(result.processes.length, 0);
  assert(!JSON.stringify(await execute(backend, 'GET', 'workspace')).includes('organizationId'));
});
test('viewer writes, expert publishing, demo escalation and stale MFA are forbidden', async () => {
  const { backend } = await harness();
  await assert.rejects(
    execute(
      backend,
      'POST',
      'processes',
      { title: 'A', equipment: 'B' },
      actor('tenant_a', 'viewer'),
    ),
    /role/,
  );
  await assert.rejects(
    execute(backend, 'POST', 'processes', { title: 'A', equipment: 'B' }, demoActor),
    /Demo identities/,
  );
  const p = asId(await execute(backend, 'POST', 'processes', { title: 'A', equipment: 'B' }));
  const body = {
    approved: true,
    steps: [
      { id: 'step_1', sequence: 1, action: 'Isolate supply', required: true, source: 'baseline' },
    ],
  };
  await assert.rejects(
    execute(backend, 'POST', `processes/${p.id}/publish`, body, actor('tenant_a', 'expert')),
    /role/,
  );
  await assert.rejects(
    execute(backend, 'POST', `processes/${p.id}/publish`, body, { ...actor(), mfa: false }),
    /multi-factor/,
  );
  await assert.rejects(
    execute(backend, 'POST', `processes/${p.id}/publish`, body, { ...actor(), authTime: 1 }),
    /multi-factor/,
  );
});
test('concurrent replay commits once and conflicting key payloads are rejected', async () => {
  const { backend, repositories } = await harness();
  const key = randomUUID();
  const calls = await Promise.all(
    Array.from({ length: 12 }, () =>
      execute(
        backend,
        'POST',
        'processes',
        { title: 'One procedure', equipment: 'X' },
        actor(),
        key,
      ),
    ),
  );
  assert.equal(new Set(calls.map((x) => asId(x).id)).size, 1);
  const store = await repositories.forTenant('tenant_a').read();
  assert.equal(store.processes.length, 1);
  assert.equal(store.auditEvents.length, 0);
  assert.equal(
    (
      await repositories
        .forTenant('tenant_a')
        .listAudit({ limit: 50, cursor: '0', sort: 'desc' as const })
    ).total,
    1,
  );
  await assert.rejects(
    execute(backend, 'POST', 'processes', { title: 'Changed', equipment: 'X' }, actor(), key),
    /different request/,
  );
  assert.equal((await repositories.forTenant('tenant_a').read()).processes.length, 1);
});
test('local repository persists across instances and rolls back failures without touching read files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ge-database-'));
  const a = new JsonRepository(directory, 'tenant_a', false),
    b = new JsonRepository(directory, 'tenant_a', false);
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      (i % 2 ? a : b).transact((s) => {
        s.auditEvents.push({
          id: randomUUID(),
          actorId: 'test',
          action: 'test',
          requestId: randomUUID(),
          timestamp: new Date().toISOString(),
          result: 'success',
        });
      }),
    ),
  );
  const before = await readFile(path.join(directory, 'store.json'), 'utf8');
  assert.equal((await b.read()).auditEvents.length, 0);
  assert.equal((await b.listAudit({ limit: 50, cursor: '0', sort: 'desc' as const })).total, 8);
  await assert.rejects(
    a.transact((s) => {
      s.auditEvents = [];
      throw new Error('rollback');
    }),
    /rollback/,
  );
  assert.equal(await readFile(path.join(directory, 'store.json'), 'utf8'), before);
  const modified = (await stat(path.join(directory, 'store.json'))).mtimeMs;
  await b.query((s) => s.auditEvents.length);
  assert.equal((await stat(path.join(directory, 'store.json'))).mtimeMs, modified);
});
test('database invariants reject cross-tenant state and duplicate trial relationships', async () => {
  const { repositories } = await harness();
  const repo = repositories.forTenant('tenant_a');
  await assert.rejects(
    repo.transact((s) => {
      s.processes = initialStore().processes;
    }),
    /Cross-organization/,
  );
  assert.equal((await repo.read()).processes.length, 0);
  await assert.rejects(
    repo.transact((s) => {
      s.results.push({
        trialId: 'missing',
        treatmentRate: 1,
        controlRate: 2,
        treatmentJobs: 100,
        controlJobs: 100,
        outcome: 'validated',
        demo: true,
      });
    }),
    /Missing result/,
  );
});
test('pagination is bounded and returns stable cursors', async () => {
  const { backend } = await harness();
  for (let i = 0; i < 3; i++)
    await execute(backend, 'POST', 'processes', { title: `Procedure ${i}`, equipment: 'X' });
  const { endpoint } = resolveEndpoint('GET', ['processes']);
  const context = { actor: actor(), requestId: randomUUID() };
  const first = (await backend.execute(endpoint, undefined, {}, context, {
    limit: 2,
    cursor: '0',
    sort: 'asc',
  })) as { items: { id: string }[]; nextCursor: string; total: number };
  const second = (await backend.execute(endpoint, undefined, {}, context, {
    limit: 2,
    cursor: first.nextCursor,
    sort: 'asc',
  })) as { items: { id: string }[] };
  assert.equal(first.total, 3);
  assert.equal(first.items.length, 2);
  assert.equal(second.items.length, 1);
  assert(!first.items.some((x) => x.id === second.items[0].id));
});
test('HMAC pseudonyms differ between organizations and contact details are redacted', () => {
  const rows = [
    {
      job_id: 'job',
      technician_id: 'sensitive-worker',
      notes: 'Email jane@example.com or 555-123-4567',
    },
  ];
  const one = normalizeRecords(rows, { organizationId: 'a', key: 'test-only-key' }),
    two = normalizeRecords(rows, { organizationId: 'b', key: 'test-only-key' });
  assert.notEqual(one[0].technicianId, two[0].technicianId);
  assert(!JSON.stringify(one).includes('sensitive-worker'));
  assert(!one[0].notes.includes('jane@'));
  assert(!one[0].notes.includes('555'));
});
test('retention purges expired captured text and imported rows and records an audit event', async () => {
  const { backend, repositories } = await harness();
  await repositories.forTenant('tenant_a').transact((s) => {
    s.processes = [{ ...initialStore().processes[0], organizationId: 'tenant_a' }];
    s.captures = [
      {
        id: 'capture',
        processId: 'valve-replacement',
        kind: 'text',
        expertReference: 'expert',
        text: 'sensitive text',
        expiresAt: new Date(0).toISOString(),
      },
    ];
  });
  await execute(backend, 'POST', 'maintenance/retention');
  const s = await repositories.forTenant('tenant_a').read();
  assert.equal(s.captures[0].text, undefined);
  const audit = await repositories
    .forTenant('tenant_a')
    .listAudit({ limit: 50, cursor: '0', sort: 'desc' as const });
  assert.equal(audit.items[0].action, 'retention');
});
test('production mode fails closed for missing config, emulator on Cloud Run and cloud demo', () => {
  assert.throws(() => readConfig({ GOOD_EXCEPTION_MODE: 'production' }), /Production requires/);
  assert.throws(() => readConfig({ K_SERVICE: 'service' }), /requires production/);
  assert.throws(
    () =>
      readConfig({
        GOOD_EXCEPTION_MODE: 'production',
        GOOGLE_CLOUD_PROJECT: 'demo-good-exception',
        GOOD_EXCEPTION_PSEUDONYM_KEY: 'x'.repeat(32),
        GOOD_EXCEPTION_ALLOWED_ORIGINS: 'https://app.example.com',
        K_SERVICE: 'service',
        FIRESTORE_EMULATOR_HOST: 'localhost:8085',
        FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
      }),
    /Emulator/,
  );
  const local = {
    GOOD_EXCEPTION_MODE: 'production',
    GOOGLE_CLOUD_PROJECT: 'demo-good-exception',
    GOOD_EXCEPTION_PSEUDONYM_KEY: 'x'.repeat(32),
    GOOD_EXCEPTION_LOCAL: 'true',
  };
  assert.ok(readConfig(local).local);
  assert.throws(() => readConfig({ ...local, K_SERVICE: 'app' }), /Local development/);
});

test('invalid model output and provider failure leave draft steps unchanged', async () => {
  const { repositories, config } = await harness();
  config.mode = 'demo';
  const badAdapter = new GuardedCaptureAdapter({
    extract: async () => [
      {
        id: 'unsafe',
        action: 'Forged',
        sequence: 1,
        required: true,
        source: 'validated_field_practice',
      },
    ],
    questions: async () => ['Why?'],
  });
  const backend = new Backend(repositories, config, badAdapter);
  const p = asId(
    await execute(backend, 'POST', 'processes', { title: 'Draft', equipment: 'X' }, demoActor),
  );
  const c = asId(
    await execute(
      backend,
      'POST',
      `processes/${p.id}/captures`,
      { kind: 'text', expertReference: 'expert', text: 'Inspect' },
      demoActor,
    ),
  );
  await assert.rejects(
    execute(
      backend,
      'POST',
      `processes/${p.id}/analyze-capture`,
      { captureId: c.id, sample: false },
      demoActor,
    ),
    /invalid draft/,
  );
  const s = await repositories.forTenant('demo-org').read();
  assert.equal(s.processes.find((x) => x.id === p.id)?.versions[0].steps.length, 0);
  assert.equal(s.processes.find((x) => x.id === p.id)?.currentVersion, 0);
});
test('draft fingerprint detects concurrent changes while extraction runs', async () => {
  const { repositories, config } = await harness();
  config.mode = 'demo';
  let start!: () => void, finish!: () => void;
  const started = new Promise<void>((resolve) => (start = resolve)),
    hold = new Promise<void>((resolve) => (finish = resolve));
  const adapter = new GuardedCaptureAdapter({
    extract: async () => {
      start();
      await hold;
      return [
        {
          id: 'step_1',
          action: 'Inspect',
          sequence: 1,
          required: true,
          source: 'expert_walkthrough',
        },
      ];
    },
    questions: async () => ['Why?'],
  });
  const backend = new Backend(repositories, config, adapter);
  const p = asId(
    await execute(backend, 'POST', 'processes', { title: 'Draft', equipment: 'X' }, demoActor),
  );
  const c = asId(
    await execute(
      backend,
      'POST',
      `processes/${p.id}/captures`,
      { kind: 'text', expertReference: 'expert', text: 'Inspect' },
      demoActor,
    ),
  );
  const pending = execute(
    backend,
    'POST',
    `processes/${p.id}/analyze-capture`,
    { captureId: c.id, sample: false },
    demoActor,
  );
  await started;
  await repositories.forTenant('demo-org').transact((s) => {
    s.processes.find((x) => x.id === p.id)!.title = 'Newer draft';
  });
  finish();
  await assert.rejects(pending, /draft changed/);
  assert.equal(
    (await repositories.forTenant('demo-org').read()).processes.find((x) => x.id === p.id)
      ?.versions[0].steps.length,
    0,
  );
});

test('Cloud Tasks configuration fails closed before starting Cloud Run AI workers', () => {
  const base = {
    GOOD_EXCEPTION_MODE: 'production',
    GOOGLE_CLOUD_PROJECT: 'demo-project',
    GOOD_EXCEPTION_ALLOWED_ORIGINS: 'https://app.example.test',
    GOOD_EXCEPTION_PSEUDONYM_KEY: 'x'.repeat(32),
  };
  assert.throws(
    () =>
      readConfig({
        ...base,
        GOOD_EXCEPTION_TASKS_QUEUE: 'projects/demo-project/locations/us-central1/queues/analysis',
      }),
    /configured together/,
  );
  assert.throws(
    () => readConfig({ ...base, K_SERVICE: 'app', GOOD_EXCEPTION_GEMINI_MODEL: 'gemini-test' }),
    /durable Cloud Tasks/,
  );
  assert.throws(
    () =>
      readConfig({
        ...base,
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        GOOD_EXCEPTION_GEMINI_MODEL: 'gemini-test',
      }),
    /forbidden during emulator/,
  );
  const tasks = {
    GOOD_EXCEPTION_TASKS_QUEUE: 'projects/demo-project/locations/us-central1/queues/analysis',
    GOOD_EXCEPTION_WORKER_URL: 'https://app.run.app/api/v1/internal/analysis',
    GOOD_EXCEPTION_TASKS_INVOKER: 'tasks@demo-project.iam.gserviceaccount.com',
  };
  assert.ok(
    readConfig({ ...base, ...tasks, K_SERVICE: 'app', GOOD_EXCEPTION_GEMINI_MODEL: 'gemini-test' })
      .tasks,
  );
  assert.throws(
    () =>
      readConfig({
        ...base,
        ...tasks,
        GOOD_EXCEPTION_WORKER_URL: tasks.GOOD_EXCEPTION_WORKER_URL + '?query=1',
      }),
    /exact HTTPS/,
  );
});
test('a scan is queued for analysis once, not again while it is already analyzing', async () => {
  const queued: string[] = [];
  const { backend, repositories } = await harness({
    enqueue: async (job) => void queued.push(job.scanId),
  });
  await repositories.forTenant('tenant_a').transact((s) => {
    s.processes = [{ ...initialStore().processes[0], organizationId: 'tenant_a' }];
    s.scans = [
      {
        id: 'scan-1',
        processId: 'valve-replacement',
        demo: false,
        records: [],
        readiness: { eligible: true } as never,
        status: 'ready',
        findingIds: [],
      },
    ];
  });
  await execute(backend, 'POST', 'scans/scan-1/run');
  await execute(backend, 'POST', 'scans/scan-1/run');
  assert.deepEqual(queued, ['scan-1']);
});
test("the workspace names the caller's organization and role", async () => {
  const { backend } = await harness();
  const workspace = (await execute(
    backend,
    'GET',
    'workspace',
    {},
    actor('public', 'reviewer'),
  )) as {
    organization: string;
    role: string;
  };
  assert.equal(workspace.organization, 'public');
  assert.equal(workspace.role, 'reviewer');
});
test("a reviewer records the technicians' explanation on a finding, replacing the last one", async () => {
  const { backend, repositories } = await harness();
  const [finding] = structuredClone(demoFindings);
  await repositories.forTenant('tenant_a').transact((s) => {
    s.processes.push({ ...structuredClone(demoProcess), organizationId: 'tenant_a' });
    s.findings.push(finding);
  });
  const url = `findings/${finding.id}/request-explanation`;
  await assert.rejects(execute(backend, 'POST', url, {}), /reason|Required|expected/i);
  const first = (await execute(backend, 'POST', url, { reason: 'Pressure drifts.' })) as {
    id: string;
    reason: string;
    warning: string;
  };
  assert.equal(first.reason, 'Pressure drifts.');
  assert.equal(first.warning, '');
  const second = (await execute(backend, 'POST', url, { reason: 'Seals settle.' })) as {
    id: string;
  };
  assert.equal(second.id, first.id);
  const stored = await repositories.forTenant('tenant_a').query((s) => s.responses);
  assert.deepEqual(
    stored.map((r) => r.reason),
    ['Seals settle.'],
  );
  const updated = (await execute(backend, 'GET', `findings/${finding.id}`)) as { status: string };
  assert.equal(updated.status, 'investigate');
});
test('audit events embedded before the audit log move out on the next commit', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ge-audit-'));
  const repo = new JsonRepository(directory, 'tenant_a', false);
  const event = (i: number) => ({
    id: `event-${i}`,
    actorId: 'test',
    action: 'legacy',
    requestId: `request-${i}`,
    timestamp: new Date(Date.now() - (1100 - i) * 1000).toISOString(),
    result: 'success' as const,
  });
  // A workspace at the old 1,000-event cap no longer blocks writes.
  await writeFile(
    path.join(directory, 'store.json'),
    JSON.stringify({
      ...initialStore('tenant_a', false),
      auditEvents: Array.from({ length: 1000 }, (_, i) => event(i)),
    }),
  );
  await repo.transact((s) => {
    s.auditEvents.push(event(1000));
  });
  assert.equal((await repo.read()).auditEvents.length, 0);
  const page = await repo.listAudit({ limit: 2, cursor: '0', sort: 'desc' });
  assert.equal(page.total, 1001);
  assert.deepEqual(
    page.items.map((e) => e.id),
    ['event-1000', 'event-999'],
  );
  assert.equal(page.nextCursor, '2');
});
test('a Firestore commit moves at most a bounded batch of pending audit events', () => {
  const s = initialStore('tenant_a', false);
  s.auditEvents = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }) as never);
  assert.equal(takeAuditEvents(s).length, AUDIT_EVENTS_PER_COMMIT);
  assert.equal(s.auditEvents[0].id, String(AUDIT_EVENTS_PER_COMMIT));
});

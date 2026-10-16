import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Backend } from '../../src/lib/application/backend';
import { JsonRepositoryProvider } from '../../src/lib/infrastructure/json-repository';
import { GuardedCaptureAdapter } from '../../src/lib/server/ai';
import { DemoGeminiAdapter } from '../../src/lib/infrastructure/demo-capture-adapter';
import type { ServerConfig } from '../../src/lib/server/config';
import type { Actor } from '../../src/lib/server/auth';
import { resolveEndpoint } from '../../src/lib/server/contracts';

const actor = (role: Actor['role'] = 'expert'): Actor => ({
  userId: `user_${role}`,
  organizationId: 'tenant_a',
  role,
  authTime: Math.floor(Date.now() / 1000),
  mfa: false,
  demo: false,
});
async function harness(rolesEnforced?: boolean) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ge-process-crud-'));
  const config: ServerConfig = {
    mode: 'production',
    dataDir: directory,
    allowedOrigins: ['https://app.example.com'],
    projectId: 'demo-good-exception',
    databaseId: '(default)',
    requireMfa: false,
    rolesEnforced,
    emulator: true,
    pseudonymKey: 'local-test-only-key-'.repeat(3),
  };
  const repositories = new JsonRepositoryProvider(directory);
  const backend = new Backend(
    repositories,
    config,
    new GuardedCaptureAdapter(new DemoGeminiAdapter()),
  );
  const execute = (method: string, url: string, body: unknown = {}, who = actor()) => {
    const { endpoint, id } = resolveEndpoint(method, url.split('/'));
    return backend.execute(endpoint, id, body, {
      actor: who,
      requestId: randomUUID(),
      idempotencyKey: randomUUID(),
    });
  };
  const create = async (who = actor()) =>
    (
      (await execute('POST', 'processes', { title: 'Brake bleed', equipment: 'Van' }, who)) as {
        id: string;
      }
    ).id;
  const tenant = repositories.forTenant('tenant_a');
  const publish = (id: string) =>
    tenant.transact((s) => {
      const p = s.processes.find((x) => x.id === id)!;
      p.currentVersion = 1;
      Object.assign(p.versions[0], { status: 'published', approvedBy: 'user_reviewer' });
    });
  return { execute, create, publish, tenant };
}

test('renaming a draft updates the process and its draft version', async () => {
  const { execute, create } = await harness();
  const id = await create();
  const updated = (await execute('PATCH', `processes/${id}`, { title: 'Brake flush' })) as {
    title: string;
    equipment: string;
    versions: { title: string }[];
  };
  assert.equal(updated.title, 'Brake flush');
  assert.equal(updated.equipment, 'Van');
  assert.equal(updated.versions[0].title, 'Brake flush');
  await assert.rejects(execute('PATCH', `processes/${id}`, {}), /Nothing to update/);
});

test('renaming a published process keeps the approved version title', async () => {
  const { execute, create, publish } = await harness();
  const id = await create();
  await publish(id);
  const updated = (await execute('PATCH', `processes/${id}`, { title: 'Brake flush' })) as {
    title: string;
    versions: { title: string }[];
  };
  assert.equal(updated.title, 'Brake flush');
  assert.equal(updated.versions[0].title, 'Brake bleed');
});

test('deleting a draft removes it and its captures', async () => {
  const { execute, create, tenant } = await harness();
  const id = await create();
  await execute('POST', `processes/${id}/captures`, {
    kind: 'text',
    expertReference: 'expert_1',
    text: 'Open the bleed valve.',
  });
  assert.deepEqual(await execute('DELETE', `processes/${id}`), {
    id,
    deleted: true,
    archived: false,
  });
  const left = await tenant.query((s) => ({
    processes: s.processes.length,
    captures: s.captures.length,
  }));
  assert.deepEqual(left, { processes: 0, captures: 0 });
  await assert.rejects(execute('GET', `processes/${id}`), /Process not found/);
});

test('deleting a published process archives it out of the lists', async () => {
  const { execute, create, publish } = await harness();
  const id = await create();
  await publish(id);
  const result = (await execute('DELETE', `processes/${id}`)) as { archived: boolean };
  assert.equal(result.archived, true);
  const workspace = (await execute('GET', 'workspace')) as { processes: unknown[] };
  assert.equal(workspace.processes.length, 0);
  const kept = (await execute('GET', `processes/${id}`)) as { archivedAt?: string };
  assert.ok(kept.archivedAt);
  await assert.rejects(execute('PATCH', `processes/${id}`, { title: 'X' }), /archived/);
});

test('viewers manage processes only when roles are not enforced', async () => {
  const enforced = await harness();
  await assert.rejects(enforced.create(actor('viewer')), /role does not permit/);

  const open = await harness(false);
  const id = await open.create(actor('viewer'));
  await open.execute('PATCH', `processes/${id}`, { title: 'Renamed' }, actor('viewer'));
  await open.execute('DELETE', `processes/${id}`, {}, actor('viewer'));
  // Only process management opens up; other writes keep their roles.
  const other = await open.create();
  await assert.rejects(
    open.execute(
      'POST',
      `processes/${other}/captures`,
      { kind: 'text', expertReference: 'expert_1', text: 'Step.' },
      actor('viewer'),
    ),
    /role does not permit/,
  );
});

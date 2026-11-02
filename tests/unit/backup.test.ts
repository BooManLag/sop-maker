import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { backupDemo, restoreDemo } from '../../src/lib/infrastructure/backup';
import { JsonRepository } from '../../src/lib/infrastructure/json-repository';
import type { Store } from '../../src/lib/application/store';
test('backup restores a separate store and rejects corrupt backups without overwriting it', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'ge-restore-'));
  const source = path.join(base, 'source'),
    target = path.join(base, 'restored');
  const repo = new JsonRepository(source);
  await repo.transact((s) => {
    s.processes[0].title = 'Recovery fixture';
  });
  const file = await backupDemo(source, path.join(base, 'backups'));
  await restoreDemo(file, target);
  assert.equal((await new JsonRepository(target).read()).processes[0].title, 'Recovery fixture');
  const corrupt = JSON.parse(await readFile(file, 'utf8'));
  corrupt.payload += ' ';
  await writeFile(file, JSON.stringify(corrupt));
  await assert.rejects(restoreDemo(file, target), /checksum/);
  assert.equal((await new JsonRepository(target).read()).processes[0].title, 'Recovery fixture');
});
test('backup carries the audit log, which lives outside the store', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'ge-restore-'));
  const source = path.join(base, 'source'),
    target = path.join(base, 'restored');
  await new JsonRepository(source).transact((s) => {
    s.auditEvents.push({
      id: 'event-1',
      actorId: 'test',
      action: 'backup-fixture',
      requestId: 'request-1',
      timestamp: new Date().toISOString(),
      result: 'success',
    });
  });
  const file = await backupDemo(source, path.join(base, 'backups'));
  await restoreDemo(file, target);
  const audit = await new JsonRepository(target).listAudit({ limit: 50, cursor: '0', sort: 'asc' });
  assert.deepEqual(
    audit.items.map((e) => e.action),
    ['backup-fixture'],
  );
});
test('restore replaces the target audit log instead of merging into it', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'ge-restore-'));
  const source = path.join(base, 'source'),
    target = path.join(base, 'restored');
  const record = (action: string) => (s: Store) => {
    s.auditEvents.push({
      id: action,
      actorId: 'test',
      action,
      requestId: action,
      timestamp: new Date().toISOString(),
      result: 'success',
    });
  };
  await new JsonRepository(source).transact(record('in-backup'));
  const file = await backupDemo(source, path.join(base, 'backups'));
  await new JsonRepository(target).transact(record('after-backup'));
  await restoreDemo(file, target);
  const audit = await new JsonRepository(target).listAudit({ limit: 50, cursor: '0', sort: 'asc' });
  assert.deepEqual(
    audit.items.map((e) => e.action),
    ['in-backup'],
  );
});

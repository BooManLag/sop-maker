import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { backupDemo, restoreDemo } from '../../src/lib/infrastructure/backup';
import { JsonRepository } from '../../src/lib/infrastructure/json-repository';
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

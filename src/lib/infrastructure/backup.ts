import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { JsonRepository } from './json-repository';
import { migrateStore, type Store } from '../application/store';
import { requireCondition } from '../server/errors';
function checksum(payload: string) {
  return createHash('sha256').update(payload).digest('hex');
}
export async function backupDemo(dataDirectory: string, backupDirectory: string) {
  const repository = new JsonRepository(dataDirectory);
  const state = await repository.query((store) => store);
  const payload = JSON.stringify(state);
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const file = path.join(backupDirectory, `demo-${Date.now()}.json`);
  await writeFile(
    file,
    JSON.stringify({
      format: 1,
      createdAt: new Date().toISOString(),
      sha256: checksum(payload),
      payload,
    }),
    { flag: 'wx', mode: 0o600 },
  );
  return file;
}
export async function restoreDemo(file: string, dataDirectory: string) {
  const backup = JSON.parse(await readFile(file, 'utf8')) as {
    format: number;
    sha256: string;
    payload: string;
  };
  requireCondition(
    backup.format === 1 &&
      typeof backup.payload === 'string' &&
      checksum(backup.payload) === backup.sha256,
    'Backup checksum or format is invalid.',
  );
  const state = migrateStore(JSON.parse(backup.payload), 'demo-org');
  const repository = new JsonRepository(dataDirectory);
  await repository.transact((store) => {
    Object.assign(store, state);
  });
  return state as Store;
}

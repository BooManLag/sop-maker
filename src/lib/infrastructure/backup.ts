import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { JsonRepository } from './json-repository';
import { migrateStore, type AuditEvent, type Store } from '../application/store';
import { requireCondition } from '../server/errors';
function checksum(payload: string) {
  return createHash('sha256').update(payload).digest('hex');
}
export async function backupDemo(dataDirectory: string, backupDirectory: string) {
  const repository = new JsonRepository(dataDirectory);
  const state = await repository.query((store) => store);
  const payload = JSON.stringify(state);
  const audit = JSON.stringify(await repository.auditEvents());
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const file = path.join(backupDirectory, `demo-${Date.now()}.json`);
  await writeFile(
    file,
    JSON.stringify({
      format: 2,
      createdAt: new Date().toISOString(),
      sha256: checksum(payload + audit),
      payload,
      audit,
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
    audit?: string;
  };
  // Format 1 predates the separate audit log; its events are inside the payload.
  const audit = backup.format === 2 ? backup.audit : '';
  requireCondition(
    (backup.format === 1 || backup.format === 2) &&
      typeof backup.payload === 'string' &&
      typeof audit === 'string' &&
      checksum(backup.payload + audit) === backup.sha256,
    'Backup checksum or format is invalid.',
  );
  const state = migrateStore(JSON.parse(backup.payload), 'demo-org');
  const events = [...(audit ? (JSON.parse(audit) as AuditEvent[]) : []), ...state.auditEvents];
  state.auditEvents = [];
  const repository = new JsonRepository(dataDirectory);
  // The restored log replaces the target's; it is swapped in once the state has committed.
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const log = `${repository.auditFile}.restore`;
  await writeFile(log, events.map((e) => JSON.stringify(e) + '\n').join(''), { mode: 0o600 });
  await repository.transact((store) => {
    Object.assign(store, state);
  });
  await rename(log, repository.auditFile);
  return state as Store;
}

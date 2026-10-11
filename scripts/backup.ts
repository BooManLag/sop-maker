import path from 'node:path';
import { readConfig } from '../src/lib/server/config';
import { backupDemo, restoreDemo } from '../src/lib/infrastructure/backup';
async function main() {
  const config = readConfig();
  if (config.mode !== 'demo')
    throw new Error(
      'This utility manages local demo backups only. Use the Firestore recovery runbook for production.',
    );
  const [command, file, confirmation] = process.argv.slice(2);
  if (command === 'restore') {
    if (!file || confirmation !== '--confirm-restore')
      throw new Error(
        'Usage: npm run backup -- restore FILE --confirm-restore. This replaces local demo data.',
      );
    await restoreDemo(file, config.dataDir);
    console.log('Local demo restored after checksum and invariant verification.');
  } else if (command === 'create') {
    console.log(await backupDemo(config.dataDir, path.join(config.dataDir, '..', '.demo-backups')));
  } else throw new Error('Usage: npm run backup -- create | restore FILE --confirm-restore');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

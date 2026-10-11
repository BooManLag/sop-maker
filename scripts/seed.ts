import { initialStore } from '../src/lib/application/store';
import { readConfig } from '../src/lib/server/config';
import { JsonRepositoryProvider } from '../src/lib/infrastructure/json-repository';

const config = readConfig();
if (config.mode !== 'demo')
  throw new Error('Local demo repository cannot be loaded in production mode.');
const repository = new JsonRepositoryProvider(config.dataDir).forTenant('demo-org');
async function seed() {
  if (process.argv.includes('--reset'))
    await repository.transact((store) => Object.assign(store, initialStore()));
  else await repository.transact(() => {});
  console.log(
    process.argv.includes('--reset')
      ? 'Demo workspace reset to the sample scenario.'
      : 'Demo workspace prepared. Existing local work is preserved; run npm run demo:reset to restore the scenario.',
  );
}
seed().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

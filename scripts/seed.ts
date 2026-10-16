import { initialStore, type Store } from '../src/lib/application/store';
import { readConfig } from '../src/lib/server/config';
import { JsonRepositoryProvider } from '../src/lib/infrastructure/json-repository';
import {
  manufacturingCaptures,
  manufacturingClarifications,
  manufacturingFindings,
  manufacturingProcesses,
} from '../src/lib/domain/manufacturing-sops';

const config = readConfig();
if (config.mode !== 'demo')
  throw new Error('Local demo repository cannot be loaded in production mode.');
const repository = new JsonRepositoryProvider(config.dataDir).forTenant('demo-org');
const reset = process.argv.includes('--reset');
const manufacturing = process.argv.includes('--manufacturing');

/** Adds the manufacturing SOP library, leaving anything already in the workspace untouched. */
function addManufacturing(store: Store) {
  const day = 86400_000;
  const add = <T extends { id: string }>(existing: T[], incoming: T[]) => {
    const ids = new Set(existing.map((x) => x.id));
    const fresh = structuredClone(incoming).filter((x) => !ids.has(x.id));
    existing.push(...fresh);
    return fresh.length;
  };
  const processes = add(store.processes, manufacturingProcesses);
  // Raw walkthroughs expire after 30 days, so date them from the day they are loaded.
  add(
    store.captures,
    manufacturingCaptures.map((c, i) => ({
      ...c,
      createdAt: new Date(Date.now() - (i + 1) * day).toISOString(),
      expiresAt: new Date(Date.now() + (29 - i) * day).toISOString(),
    })),
  );
  add(store.clarifications, manufacturingClarifications);
  add(store.findings, manufacturingFindings);
  return processes;
}

async function seed() {
  if (reset) await repository.transact((store) => Object.assign(store, initialStore()));
  let added = 0;
  if (manufacturing) await repository.transact((store) => void (added = addManufacturing(store)));
  else if (!reset) await repository.transact(() => {});
  console.log(
    reset
      ? 'Demo workspace reset to the sample scenario.'
      : 'Demo workspace prepared. Existing local work is preserved; run npm run demo:reset to restore the scenario.',
  );
  if (manufacturing)
    console.log(
      added
        ? `Added ${added} manufacturing SOPs.`
        : 'The manufacturing SOPs are already in this workspace.',
    );
}
seed().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

// Compatibility exports for local seed and domain tests. Production composition lives in server/runtime.ts.
import { readConfig } from './server/config';
import { JsonRepositoryProvider } from './infrastructure/json-repository';
export { initialStore } from './application/store';
export type { Store } from './application/store';
export type { Repository, RepositoryProvider } from './application/ports';
const config = readConfig();
if (config.mode !== 'demo')
  throw new Error('Local demo repository cannot be loaded in production mode.');
export const repository = new JsonRepositoryProvider(config.dataDir).forTenant('demo-org');

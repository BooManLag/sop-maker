/** Dispatches an API call through the runtime backend as the demo actor. HTTP identity always comes from server/http.ts. */
import { randomUUID } from 'node:crypto';
import { getRuntime } from '../../src/lib/server/runtime';
import { demoActor } from '../../src/lib/server/auth';
import { resolveEndpoint } from '../../src/lib/server/contracts';

export async function handleApi(method: string, segments: string[], body: unknown = {}) {
  const { endpoint, id } = resolveEndpoint(method, segments);
  return getRuntime().backend.execute(endpoint, id, body, {
    actor: demoActor,
    requestId: randomUUID(),
  });
}

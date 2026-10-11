/** Internal facade retained for local tests. HTTP identity always comes from server/http.ts. */
import { randomUUID } from 'node:crypto';
import { getRuntime } from './server/runtime';
import { readConfig } from './server/config';
import { demoActor, type RequestContext } from './server/auth';
import { ApiError } from './server/errors';
import { resolveEndpoint } from './server/contracts';
export { ApiError } from './server/errors';
export async function handleApi(
  method: string,
  segments: string[],
  body: unknown = {},
  context?: RequestContext,
) {
  const { endpoint, id } = resolveEndpoint(method, segments);
  if (!context && readConfig().mode !== 'demo')
    throw new ApiError(401, 'Authenticated request context is required.');
  return getRuntime().backend.execute(
    endpoint,
    id,
    body,
    context ?? { actor: demoActor, requestId: randomUUID() },
  );
}

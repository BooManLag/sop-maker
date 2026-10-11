import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Backend } from '../../src/lib/application/backend';
import { JsonRepositoryProvider } from '../../src/lib/infrastructure/json-repository';
import { GuardedCaptureAdapter } from '../../src/lib/server/ai';
import { DemoGeminiAdapter } from '../../src/lib/infrastructure/demo-capture-adapter';
import { createHttpHandler } from '../../src/lib/server/http';
import type { ServerConfig } from '../../src/lib/server/config';

export const sessionToken = 'test-session-token-for-tenant-a';

/**
 * A `fetch` that serves requests from the real HTTP handler over a throwaway store.
 * Demo mode answers loopback requests as the demo identity; production expects `sessionToken`.
 */
export async function realBackendFetch(mode: ServerConfig['mode'] = 'production') {
  const origin = mode === 'demo' ? 'http://127.0.0.1:3000' : 'https://app.example.com';
  const config: ServerConfig = {
    mode,
    dataDir: await mkdtemp(path.join(tmpdir(), 'ge-client-')),
    allowedOrigins: [origin],
    projectId: 'demo-good-exception',
    databaseId: '(default)',
    requireMfa: false,
    emulator: true,
    pseudonymKey: 'test-only-pseudonym-key-'.repeat(2),
  };
  const handler = createHttpHandler({
    backend: new Backend(
      new JsonRepositoryProvider(config.dataDir),
      config,
      new GuardedCaptureAdapter(new DemoGeminiAdapter()),
    ),
    config,
    verifier: {
      verify: async (presented) => {
        assert.equal(presented, sessionToken);
        return {
          uid: 'user_a',
          organizationId: 'tenant_a',
          role: 'admin',
          auth_time: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
      },
    },
  });
  const sent: Request[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(
      new URL(String(input instanceof Request ? input.url : input), origin),
      init,
    );
    sent.push(request.clone());
    const segments = new URL(request.url).pathname.split('/').slice(2);
    return handler(request, segments);
  };
  return { fetch, origin, sent };
}

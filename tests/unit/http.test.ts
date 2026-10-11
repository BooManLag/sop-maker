import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Backend } from '../../src/lib/application/backend';
import { JsonRepositoryProvider } from '../../src/lib/infrastructure/json-repository';
import { GuardedCaptureAdapter } from '../../src/lib/server/ai';
import { DemoGeminiAdapter } from '../../src/lib/services';
import { createHttpHandler } from '../../src/lib/server/http';
import { Observability } from '../../src/lib/server/observability';
import { AdmissionControl, readJson } from '../../src/lib/server/limits';
import { authenticate } from '../../src/lib/server/auth';
import type { ServerConfig } from '../../src/lib/server/config';
async function setup() {
  const logs: Record<string, unknown>[] = [];
  const config: ServerConfig = {
    mode: 'production',
    dataDir: await mkdtemp(path.join(tmpdir(), 'ge-http-')),
    allowedOrigins: ['https://app.example.com'],
    projectId: 'demo-good-exception',
    databaseId: '(default)',
    requireMfa: false,
    emulator: true,
    pseudonymKey: 'test-only-pseudonym-key-'.repeat(2),
  };
  const verifier = {
    verify: async (token: string) => {
      if (token === 'bad'.repeat(10)) throw new Error('private provider detail');
      return {
        uid: 'user_a',
        organizationId: 'tenant_a',
        role: token === 'viewer'.repeat(5) ? 'viewer' : 'admin',
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    },
  };
  const backend = new Backend(
    new JsonRepositoryProvider(config.dataDir),
    config,
    new GuardedCaptureAdapter(new DemoGeminiAdapter()),
  );
  return {
    handler: createHttpHandler({
      backend,
      config,
      verifier,
      observability: new Observability((entry) => logs.push(entry)),
    }),
    logs,
    config,
    verifier,
  };
}
function request(
  pathname: string,
  method = 'GET',
  body?: unknown,
  extra: Record<string, string> = {},
) {
  return new Request(`https://app.example.com/api/${pathname}`, {
    method,
    headers: {
      authorization: `Bearer ${'admin'.repeat(6)}`,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      ...extra,
    },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  });
}
test('authentication is required and invalid tokens disclose no provider details', async () => {
  const { handler } = await setup();
  for (const authorization of ['', `Bearer ${'bad'.repeat(10)}`]) {
    const response = await handler(request('workspace', 'GET', undefined, { authorization }), [
      'workspace',
    ]);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.code, 'UNAUTHENTICATED');
    assert(body.requestId);
    assert(!JSON.stringify(body).includes('private'));
  }
});
test('strict transport errors, safe response headers and bounded streaming payloads', async () => {
  const { handler } = await setup();
  const oversized = new Request('https://app.example.com/api/processes', {
    method: 'POST',
    headers: { authorization: `Bearer ${'admin'.repeat(6)}`, 'content-type': 'application/json' },
    body: ' '.repeat(1_000_001),
  });
  assert.equal((await handler(oversized, ['processes'])).status, 413);
  assert.equal(
    (
      await handler(
        request(
          'processes',
          'POST',
          { title: 'a', equipment: 'b' },
          { 'content-type': 'text/plain' },
        ),
        ['processes'],
      )
    ).status,
    415,
  );
  const malformed = new Request('https://app.example.com/api/processes', {
    method: 'POST',
    headers: { authorization: `Bearer ${'admin'.repeat(6)}`, 'content-type': 'application/json' },
    body: '{oops',
  });
  assert.equal((await handler(malformed, ['processes'])).status, 400);
  const response = await handler(request('workspace'), ['workspace']);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-api-version'), '1');
  assert.equal(response.status, 200);
});
test('disallowed origins, privilege escalation and unsupported methods fail before writes', async () => {
  const { handler } = await setup();
  assert.equal(
    (
      await handler(
        request(
          'processes',
          'POST',
          { title: 'A', equipment: 'B' },
          { origin: 'https://evil.example' },
        ),
        ['processes'],
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handler(
        request(
          'processes',
          'POST',
          { title: 'A', equipment: 'B' },
          { authorization: `Bearer ${'viewer'.repeat(5)}` },
        ),
        ['processes'],
      )
    ).status,
    403,
  );
  assert.equal((await handler(request('processes', 'DELETE'), ['processes'])).status, 405);
  assert.equal((await handler(request('v1/workspace'), ['v1', 'workspace'])).status, 200);
});
test('request logging excludes input text, bearer tokens and personal identifiers', async () => {
  const { handler, logs } = await setup();
  await handler(
    request('processes', 'POST', { title: 'secret walkthrough phrase', equipment: 'X' }),
    ['processes'],
  );
  const text = JSON.stringify(logs);
  assert(!text.includes('secret walkthrough phrase'));
  assert(!text.includes('adminadmin'));
  assert(!text.includes('user_a'));
  assert(logs[0].requestId);
  assert(logs[0].durationMs !== undefined);
});
test('body parsing rejects prototype keys, deep structures, arrays at schema layer and oversized chunked input', async () => {
  for (const value of [
    '{"__proto__":{"polluted":true}}',
    '{"a":'.repeat(15) + '0' + '}'.repeat(15),
  ])
    await assert.rejects(
      readJson(
        new Request('http://localhost', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: value,
        }),
      ),
      /Unsafe|nesting/,
    );
  const { handler } = await setup();
  assert.equal((await handler(request('processes', 'POST', []), ['processes'])).status, 400);
  const streaming = new Request('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(700000));
        controller.enqueue(new Uint8Array(700000));
        controller.close();
      },
    }),
    duplex: 'half',
  } as RequestInit);
  await assert.rejects(readJson(streaming), /1 MB/);
});
test('revoked or expired identity cannot authorize and missing claims do not become admin', async () => {
  const { config } = await setup();
  await assert.rejects(
    authenticate(request('workspace'), config, {
      verify: async () => ({ uid: 'u', role: 'admin', exp: 1, auth_time: 1 }),
    }),
    /membership/,
  );
  await assert.rejects(
    authenticate(request('workspace'), config, {
      verify: async () => ({ uid: 'u', organizationId: 't', role: 'admin', exp: 1, auth_time: 1 }),
    }),
    /expired/,
  );
});
test('rate limits, in-flight limits and graceful draining reject excess work', async () => {
  const gate = new AdmissionControl();
  gate.rate('user', 1);
  assert.throws(() => gate.rate('user', 1), /Too many/);
  const releases = Array.from({ length: 32 }, () => gate.enter());
  assert.throws(() => gate.enter(), /busy/);
  releases.forEach((fn) => fn());
  assert.equal(await gate.drain(), true);
  assert.throws(() => gate.enter(), /busy/);
});

test('normalized Next.js loopback URLs preserve same-origin browser POSTs without allowing hostile hosts', async () => {
  const { config, logs } = await setup();
  config.mode = 'demo';
  const backend = new Backend(
    new JsonRepositoryProvider(config.dataDir),
    config,
    new GuardedCaptureAdapter(new DemoGeminiAdapter()),
  );
  const handler = createHttpHandler({
    backend,
    config,
    verifier: {
      verify: async () => {
        throw new Error('not used');
      },
    },
    observability: new Observability((entry) => logs.push(entry)),
  });
  const make = (host: string, origin: string) =>
    new Request('http://localhost:3100/api/processes', {
      method: 'POST',
      headers: { host, origin, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Loopback', equipment: 'X' }),
    });
  assert.equal(
    (await handler(make('127.0.0.1:3100', 'http://127.0.0.1:3100'), ['processes'])).status,
    201,
  );
  assert.equal(
    (await handler(make('127.0.0.1:3100', 'http://127.0.0.1:9999'), ['processes'])).status,
    403,
  );
  assert.equal(
    (await handler(make('evil.example', 'http://evil.example'), ['processes'])).status,
    403,
  );
});

test('every registered data operation rejects missing authentication', async () => {
  const { handler } = await setup();
  const { endpoints } = await import('../../src/lib/server/contracts');
  for (const endpoint of endpoints) {
    const segments = endpoint.path.replace(':id', 'resource_1').split('/');
    const response = await handler(
      request(segments.join('/'), endpoint.method, {}, { authorization: '' }),
      segments,
    );
    assert.equal(response.status, 401, endpoint.operation);
  }
});

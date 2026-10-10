import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getApps, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readConfig } from '../../lib/server/config';
import { firestoreDatabase, firebaseTokenVerifier } from '../../lib/infrastructure/firebase';
import { FirestoreRepositoryProvider } from '../../lib/infrastructure/firestore-repository';
import { Backend } from '../../lib/application/backend';
import { GuardedCaptureAdapter, UnavailableCaptureAdapter } from '../../lib/server/ai';
import { createHttpHandler } from '../../lib/server/http';
import { Observability } from '../../lib/server/observability';
// This suite is never allowed to connect to a real project or a non-loopback emulator.
if (
  process.env.GOOGLE_CLOUD_PROJECT !== 'demo-good-exception' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw new Error(
    'Start both isolated emulators and run npm run test:emulator. Live tests are forbidden.',
  );
const config = readConfig();
const database = firestoreDatabase(config);
const repositories = new FirestoreRepositoryProvider(database);
const backend = new Backend(
  repositories,
  config,
  new GuardedCaptureAdapter(new UnavailableCaptureAdapter()),
);
const handler = createHttpHandler({
  backend,
  config,
  verifier: firebaseTokenVerifier(config),
  observability: new Observability(() => {}),
});
async function identity(org: string, role = 'admin') {
  const email = `test-${randomUUID()}@example.test`,
    password = randomUUID() + randomUUID();
  const auth = getAuth(getApps().find((x) => x.name === 'good-exception-demo-good-exception')!);
  const user = await auth.createUser({ email, password });
  await auth.setCustomUserClaims(user.uid, { organizationId: org, role });
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  assert.equal(response.status, 200);
  const { idToken } = (await response.json()) as { idToken: string };
  return { idToken, uid: user.uid, auth };
}
async function call(
  token: string,
  method: string,
  pathname: string,
  body?: unknown,
  key = randomUUID(),
) {
  return handler(
    new Request(`https://app.example.test/api/${pathname}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'idempotency-key': key,
      },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    }),
    pathname.split('/'),
  );
}
test('Firebase emulator verifies real tokens, claims, tenant isolation and disabled-user rejection', async () => {
  const org = `org_${randomUUID().replaceAll('-', '')}`;
  const a = await identity(org),
    b = await identity(`other_${org}`),
    viewer = await identity(org, 'viewer');
  const created = await call(a.idToken, 'POST', 'processes', {
    title: 'Emulator procedure',
    equipment: 'Valve X',
  });
  assert.equal(created.status, 201);
  const process = (await created.json()) as { id: string };
  assert.equal((await call(a.idToken, 'GET', `processes/${process.id}`)).status, 200);
  assert.equal((await call(b.idToken, 'GET', `processes/${process.id}`)).status, 404);
  assert.equal(
    (await call(viewer.idToken, 'POST', 'processes', { title: 'no', equipment: 'no' })).status,
    403,
  );
  const stored = await new FirestoreRepositoryProvider(database).forTenant(org).read();
  assert.equal(stored.processes.length, 1);
  assert.equal(stored.auditEvents.length, 1);
  await a.auth.updateUser(a.uid, { disabled: true });
  assert.equal((await call(a.idToken, 'GET', 'workspace')).status, 401);
});
test('Firestore transaction retries preserve idempotency and rollback domain failures', async () => {
  const org = `race_${randomUUID().replaceAll('-', '')}`;
  const user = await identity(org);
  const key = randomUUID();
  const responses = await Promise.all(
    Array.from({ length: 6 }, () =>
      call(user.idToken, 'POST', 'processes', { title: 'Once', equipment: 'X' }, key),
    ),
  );
  for (const response of responses) assert.equal(response.status, 201);
  const bodies = (await Promise.all(responses.map((r) => r.json()))) as { id: string }[];
  assert.equal(new Set(bodies.map((b) => b.id)).size, 1);
  assert.equal((await repositories.forTenant(org).read()).processes.length, 1);
  const repo = repositories.forTenant(org);
  await assert.rejects(
    repo.transact((s) => {
      s.processes = [];
      throw new Error('rollback');
    }),
    /temporarily unavailable/,
  );
  assert.equal((await repo.read()).processes.length, 1);
  assert.equal(
    (await call(user.idToken, 'POST', 'processes', { title: 'Different', equipment: 'X' }, key))
      .status,
    409,
  );
});
test('Firestore rules deny direct browser writes and reads', async () => {
  const origin =
    'http://127.0.0.1:8085/v1/projects/demo-good-exception/databases/(default)/documents/organizations/forbidden/backend/state';
  const write = await fetch(origin, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { payload: { stringValue: '{}' } } }),
  });
  assert.equal(write.status, 403);
  const read = await fetch(origin);
  assert.equal(read.status, 403);
});
after(async () => {
  await database.terminate();
  await Promise.all(getApps().map((app) => deleteApp(app)));
});

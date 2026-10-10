import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiRequestError, createApiClient } from '../lib/client/api';
import type { ServerConfig } from '../lib/server/config';
import { realBackendFetch, sessionToken } from './support/real-backend';

async function clientAgainstRealBackend(mode: ServerConfig['mode'] = 'production') {
  const { fetch, origin, sent } = await realBackendFetch(mode);
  const api = createApiClient({
    baseUrl: `${origin}/api/v1`,
    getToken: async () => sessionToken,
    fetch,
  });
  return { api, sent };
}

test('the client creates and reads back a process with the session token', async () => {
  const { api } = await clientAgainstRealBackend();

  const created = await api.createProcess({ title: 'Valve Replacement', equipment: 'Valve X' });
  const loaded = await api.process(created.id);

  assert.equal(loaded.title, 'Valve Replacement');
  assert.equal(loaded.currentVersion, 0);
});

test('every write carries its own idempotency key so retries are safe', async () => {
  const { api, sent } = await clientAgainstRealBackend();

  await api.createProcess({ title: 'A', equipment: 'B' });
  await api.createProcess({ title: 'C', equipment: 'D' });

  const keys = sent.map((r) => r.headers.get('idempotency-key'));
  assert.equal(keys.length, 2);
  assert.ok(keys.every((key) => key && /^[A-Za-z0-9_-]{16,128}$/.test(key)));
  assert.notEqual(keys[0], keys[1]);
});

test('a rejected request surfaces the server message and status', async () => {
  const { api } = await clientAgainstRealBackend();

  await assert.rejects(api.process('missing-process'), (error) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.status, 404);
    assert.equal(error.message, 'Process not found.');
    return true;
  });
});

test('a sample scan can be reopened by URL with its readiness and result funnel', async () => {
  const { api } = await clientAgainstRealBackend('demo');
  const { id } = await api.createScan({ processId: 'valve-replacement', demo: true });

  assert.equal((await api.scan(id)).readiness, undefined);
  await api.checkReadiness(id);
  const ready = await api.scan(id);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.readiness?.count, 47219);

  const run = await api.runScan(id);
  assert.deepEqual((await api.scan(id)).funnel, run.funnel);
});

test('a proposed SOP change reopens by URL with its trial evidence, in one request', async () => {
  const { api, sent } = await clientAgainstRealBackend('demo');
  const trial = await api.createTrial({
    findingId: 'finding-18',
    equipment: 'Valve assembly X',
    testGroup: 'Eligible valve replacement jobs',
  });
  await api.loadSampleResult(trial.id);
  const proposed = await api.proposeChange(trial.id);

  sent.length = 0;

  const reopened = await api.changeRequest(proposed.id);

  assert.equal(sent.length, 1);
  assert.equal(reopened.proposedStep, proposed.proposedStep);
  assert.equal(reopened.trial.result?.outcome, 'validated');
  assert.equal(reopened.trial.finding.id, 'finding-18');
});

test('a trial opens together with the finding it validates, in one request', async () => {
  const { api, sent } = await clientAgainstRealBackend('demo');
  const created = await api.createTrial({
    findingId: 'finding-18',
    equipment: 'Valve assembly X',
    testGroup: 'Eligible valve replacement jobs',
  });
  sent.length = 0;

  const trial = await api.trial(created.id);

  assert.equal(sent.length, 1);
  assert.equal(trial.finding.practice, 'Wait 3–5 minutes and repeat the pressure test.');
});

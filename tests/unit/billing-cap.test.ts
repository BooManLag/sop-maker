import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { createHandler } = createRequire(import.meta.url)(
  '../../infra/functions/billing-cap/handler.js',
);
const topic = 'projects/demo-project/topics/app-budget';
const payload = {
  budgetDisplayName: 'app monthly',
  budgetAmount: 20,
  costAmount: 20,
  currencyCode: 'USD',
  budgetAmountType: 'SPECIFIED_AMOUNT',
  costIntervalStart: '2026-10-01T07:00:00Z',
};
const event = (data: unknown) => ({
  source: `//pubsub.googleapis.com/${topic}`,
  data: { message: { data: Buffer.from(JSON.stringify(data)).toString('base64') } },
});
function setup(dryRun?: boolean, clock = '2026-10-12T00:00:00Z') {
  const calls: string[] = [];
  let enabled = true;
  const handler = createHandler({
    projectId: 'demo-project',
    budgetName: 'app monthly',
    budgetAmount: 20,
    topic,
    dryRun,
    now: () => new Date(clock),
    log: () => {},
    billingApi: async (method: string, body?: unknown) => {
      calls.push(method);
      if (method === 'PUT') {
        assert.deepEqual(body, { billingAccountName: '' });
        enabled = false;
      }
      return { billingEnabled: enabled };
    },
  });
  return { handler, calls };
}
test('billing shutoff defaults to dry run without calling billing APIs', async () => {
  const { handler, calls } = setup();
  await handler(event(payload));
  assert.deepEqual(calls, []);
});
test('billing shutoff rejects stale, malformed, zero, wrong-budget and wrong-currency notifications', async () => {
  const { handler, calls } = setup(false);
  for (const data of [
    null,
    {},
    { ...payload, costAmount: '20' },
    { ...payload, costAmount: 19 },
    { ...payload, budgetAmount: 0 },
    { ...payload, budgetDisplayName: 'other' },
    { ...payload, currencyCode: 'PHP' },
    { ...payload, costIntervalStart: '2026-09-01T07:00:00Z' },
    { ...payload, costIntervalStart: '2026-11-01T07:00:00Z' },
  ])
    await handler(event(data));
  await handler({ ...event(payload), source: 'other' });
  await handler({ data: { message: { data: 'invalid' } } });
  assert.deepEqual(calls, []);
});
test('explicit shutoff unlinks billing at threshold and tolerates sequential redelivery', async () => {
  const { handler, calls } = setup(false);
  await handler(event(payload));
  await handler(event(payload));
  assert.deepEqual(calls, ['GET', 'PUT', 'GET']);
});

test('billing intervals follow Pacific month boundaries and winter UTC offsets', async () => {
  const winter = setup(false, '2027-01-12T00:00:00Z');
  await winter.handler(event({ ...payload, costIntervalStart: '2027-01-01T08:00:00Z' }));
  assert.deepEqual(winter.calls, ['GET', 'PUT']);
  const boundary = setup(false, '2026-11-01T01:00:00Z');
  await boundary.handler(event(payload)); // Still October in the billing timezone.
  assert.deepEqual(boundary.calls, ['GET', 'PUT']);
});

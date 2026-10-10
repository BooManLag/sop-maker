import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readServiceRecords } from '../lib/sop/records';
import { relativeReduction } from '../lib/sop/findings';

const csvFile = (text: string, size = text.length) => ({
  size,
  arrayBuffer: async () => new TextEncoder().encode(text).buffer as ArrayBuffer,
});

test('a CSV export becomes one service record per job row', async () => {
  const rows = await readServiceRecords(
    csvFile('job_id,technician_id,callback_within_30_days\nJ1,T7,yes\nJ2,T8,no\n'),
  );
  assert.deepEqual(rows, [
    { job_id: 'J1', technician_id: 'T7', callback_within_30_days: 'yes' },
    { job_id: 'J2', technician_id: 'T8', callback_within_30_days: 'no' },
  ]);
});

test('oversized and empty files are rejected with guidance', async () => {
  await assert.rejects(readServiceRecords(csvFile('job_id\nJ1', 4_000_001)), /smaller than 4 MB/);
  await assert.rejects(readServiceRecords(csvFile('job_id\n')), /No service records/);
});

test('relative reduction is the share of callbacks avoided, rounded', () => {
  assert.equal(relativeReduction({ baselineRate: 6.2, practiceRate: 4.1 }), 34);
  assert.equal(relativeReduction({ baselineRate: 6, practiceRate: 5 }), 17);
  assert.equal(relativeReduction({ baselineRate: 0, practiceRate: 0 }), 0);
});

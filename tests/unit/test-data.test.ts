import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readServiceRecords } from '../../src/lib/domain/records';
import { EvidenceEngine, normalizeRecords } from '../../src/lib/application/evidence-engine';

const dir = join(process.cwd(), 'test-data', 'manufacturing');
const load = async (name: string) => {
  const bytes = await readFile(join(dir, name));
  const rows = await readServiceRecords({
    size: bytes.byteLength,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  return normalizeRecords(rows as unknown as Record<string, unknown>[]);
};

for (const name of [
  'cnc-spindle-bearing-replacement.csv',
  'cnc-spindle-bearing-replacement.xlsx',
  'injection-mold-changeover.csv',
  'robot-weld-torch-service.csv',
  'smt-stencil-printer-service-small.csv',
])
  test(`${name} passes the data readiness check`, async () => {
    const records = await load(name);
    const readiness = new EvidenceEngine().readiness(records);
    assert.deepEqual(readiness.missing, []);
    assert.ok(records.length >= 30);
  });

test('the insufficient sample is rejected for its size alone', async () => {
  const { eligible, missing } = new EvidenceEngine().readiness(
    await load('insufficient-records.csv'),
  );
  assert.equal(eligible, false);
  assert.equal(missing.length, 1);
  assert.match(missing[0], /At least 30/);
});

test('the messy export fails every quality check and has contact details removed', async () => {
  const records = await load('messy-records.csv');
  const { eligible, missing } = new EvidenceEngine().readiness(records);
  assert.equal(eligible, false);
  assert.equal(missing.length, 5);
  const notes = records.map((r) => r.notes).join('\n');
  assert.doesNotMatch(notes, /@example\.com|555 014/);
  assert.match(notes, /\[email removed\]/);
});

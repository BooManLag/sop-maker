import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialStore, validateStore } from '../../src/lib/application/store';
import {
  compactScans,
  completeAnalysis,
  failAnalysis,
  FAILED_RETRY_MS,
  runScan,
  STUCK_ANALYSIS_MS,
  findingDetailDto,
  scanDto,
} from '../../src/lib/application/evidence-service';
import type { Execution, Scan } from '../../src/lib/domain/types';
import type { ProposedFinding } from '../../src/lib/application/analysis/toolkit';

const record = (i: number, notes: string): Execution => ({
  id: `job-${i}`,
  technicianId: `tech_${i % 3}`,
  assetId: 'a1',
  equipmentModel: 'Hakko FX-888D',
  jobType: 'rework',
  timestamp: new Date(Date.UTC(2026, 3, 1 + i)).toISOString(),
  checklistValues: 'esd_strap:true',
  partsUsed: 'solder',
  notes,
  callback: i % 7 === 0,
});
const practiceNotes = [
  'Fresh flux on every pad',
  'IPA wipe then flux',
  'Re-fluxed before soldering',
];
const records = Array.from({ length: 240 }, (_, i) =>
  record(i, i % 4 === 0 ? practiceNotes[i % 3] : 'Standard rework, no issues'),
);
const practiceIds = records.filter((r) => practiceNotes.includes(r.notes)).map((r) => r.id);

function analyzingStore() {
  const s = initialStore();
  const scan: Scan = {
    id: 'scan-1',
    processId: 'valve-replacement',
    demo: false,
    records: structuredClone(records),
    status: 'analyzing',
    findingIds: [],
  };
  s.scans.push(scan);
  return { s, scan };
}
const rates = { jobs: 0, callbacks: 0, rate: 0 };
const proposal: ProposedFinding = {
  title: 'Fresh flux',
  standardStepId: 'step-1',
  standard: 'Isolate pressure supply',
  practice: 'Add fresh flux',
  description: '',
  jobIds: practiceIds,
  evaluation: {
    jobs: 60,
    technicians: 3,
    discovery: { practice: rates, baseline: rates, z: 2.1 },
    heldOut: { practice: rates, baseline: rates, holds: true },
    practiceRate: 2,
    baselineRate: 10,
    grade: 'strong',
    reason: '',
  },
};

test('a finished scan keeps only the rows its findings show as examples', () => {
  const { s, scan } = analyzingStore();
  completeAnalysis(s, scan.id, { findings: [proposal], funnel: [240, 1, 1, 1, 1] }, 1);
  assert.deepEqual(
    scan.records.map((r) => r.notes),
    practiceNotes,
  );
  assert.equal(scanDto(scan).recordCount, 240);
  assert.deepEqual(findingDetailDto(s, scan.findingIds[0]).examples, practiceNotes);
});

test('a finished scan without findings keeps no rows', () => {
  const { s, scan } = analyzingStore();
  completeAnalysis(s, scan.id, { findings: [], funnel: [240, 1, 0, 0, 0] }, 1);
  assert.equal(scan.records.length, 0);
  assert.equal(scanDto(scan).recordCount, 240);
});

test('scans finished before compaction are compacted once, freeing tenant state', () => {
  const { s } = analyzingStore();
  // A dozen full scans no longer fit the bounded tenant state.
  for (let i = 2; i <= 14; i++)
    s.scans.push({
      id: `scan-${i}`,
      processId: 'valve-replacement',
      demo: false,
      records: structuredClone(records),
      status: 'complete',
      findingIds: [],
    });
  assert.throws(() => validateStore(s, 'demo-org'), /storage limit/);
  compactScans(s);
  assert.doesNotThrow(() => validateStore(s, 'demo-org'));
  const done = s.scans.filter((x) => x.status === 'complete');
  assert.ok(done.every((x) => x.records.length === 0 && x.recordCount === 240));
  // The scan still analyzing keeps every row.
  assert.equal(s.scans.find((x) => x.id === 'scan-1')!.records.length, 240);
  compactScans(s);
  assert.ok(done.every((x) => x.recordCount === 240));
});

test('a failed scan keeps its rows for a day of retries, then drops them', () => {
  const { s, scan } = analyzingStore();
  failAnalysis(s, scan.id);
  const failedAt = Date.parse(scan.failedAt!);
  compactScans(s, failedAt + FAILED_RETRY_MS - 1);
  assert.equal(scan.records.length, 240);
  compactScans(s, failedAt + FAILED_RETRY_MS + 1);
  assert.equal(scan.records.length, 0);
  assert.equal(scanDto(scan).recordCount, 240);
  assert.equal(scanDto(scan).recordsCleared, true);
  scan.readiness = { eligible: true, count: 240, categories: [], can: [], cannot: [], missing: [] };
  assert.throws(() => runScan(s, scan.id, true), /Import the file again/);
});

test('a scan analyzing past the stuck cutoff is marked failed, keeping its rows to retry', () => {
  const { s, scan } = analyzingStore();
  scan.analysisStartedAt = new Date(0).toISOString();
  compactScans(s, STUCK_ANALYSIS_MS - 1);
  assert.equal(scan.status, 'analyzing');
  compactScans(s, STUCK_ANALYSIS_MS + 1);
  assert.equal(scan.status, 'failed');
  assert.equal(scan.records.length, 240);
  compactScans(s, STUCK_ANALYSIS_MS + 1 + FAILED_RETRY_MS + 1);
  assert.equal(scan.records.length, 0);
});

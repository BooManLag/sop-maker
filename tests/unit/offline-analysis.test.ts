import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readServiceRecords } from '../../src/lib/domain/records';
import { normalizeRecords } from '../../src/lib/application/evidence-engine';
import { AnalysisToolkit, clusterSignals } from '../../src/lib/application/analysis/toolkit';
import { OfflineEmbedder, offlineDriver } from '../../src/lib/infrastructure/offline-analysis';
import { manufacturingProcesses } from '../../src/lib/domain/manufacturing-sops';
import { evidenceSummary } from '../../src/features/findings/evidence-summary';
import type { Finding } from '../../src/lib/domain/types';

async function analyze(file: string, processId: string) {
  const bytes = await readFile(join(process.cwd(), 'test-data', file));
  const rows = await readServiceRecords({
    size: bytes.byteLength,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  const records = normalizeRecords(rows as unknown as Record<string, unknown>[]);
  const steps = manufacturingProcesses.find((p) => p.id === processId)!.versions[0].steps;
  const kit = new AnalysisToolkit(
    records,
    steps,
    await clusterSignals(records, new OfflineEmbedder()),
  );
  await offlineDriver(kit, new AbortController().signal);
  const notes = new Map(records.map((r) => [r.id, r.notes]));
  return { kit, notes };
}

const cases = [
  ['processes/soldering-202.csv', 'soldering-202', 'strong', /flux/i],
  ['processes/iphone-11-screen-repair.csv', 'iphone-11-screen-repair', 'promising', /Face ID/],
  ['processes/shed-building.csv', 'shed-building', 'strong', /diagonals/],
  ['processes/reset-bios.csv', 'reset-bios', 'promising', /BitLocker|BIOS settings/],
  [
    'manufacturing/cnc-spindle-bearing-replacement.csv',
    'spindle-bearing-replacement',
    'strong',
    /warm-up/i,
  ],
  [
    'manufacturing/injection-mold-changeover.csv',
    'injection-mold-changeover',
    'promising',
    /cooling|dry cycle/,
  ],
] as const;

for (const [file, processId, grade, practice] of cases)
  test(`the simulated scan of ${file} finds only its planted practice`, async () => {
    const { kit, notes } = await analyze(file, processId);
    assert.equal(kit.proposals.length, 1);
    const [finding] = kit.proposals;
    assert.equal(finding.evaluation.grade, grade);
    assert.match(finding.practice, practice);
    // Every job behind the finding wrote a note describing the practice, never a shortcut.
    for (const id of finding.jobIds) assert.match(notes.get(id)!, practice);
    assert.ok(kit.sop().some((s) => s.stepId === finding.standardStepId));
  });

test('the decoy dataset yields no finding', async () => {
  const { kit } = await analyze(
    'manufacturing/robot-weld-torch-service.csv',
    'robot-weld-torch-service',
  );
  assert.equal(kit.proposals.length, 0);
});

const computed: Finding = {
  id: 'f1',
  processId: 'soldering-202',
  title: 'Fresh flux',
  grade: 'promising',
  description: '',
  standard: 'Clean and flux the pads',
  practice: 'Add fresh flux',
  baselineRate: 12,
  practiceRate: 4,
  technicians: 2,
  status: 'candidate',
  evidence: {
    sourceRecordIds: [],
    sopVersion: 1,
    analysisVersion: 'offline-demo-v1',
    sampleSize: 20,
    heldOutResult: '',
    methodology: '',
    demonstration: false,
    statistics: {
      discovery: { practiceRate: 5, baselineRate: 12.5 },
      heldOut: { practiceRate: 0, baselineRate: 10, practiceJobs: 6 },
      z: 1.2,
    },
  },
};

test('a computed finding explains its rates, the held-out check and every shortfall', () => {
  const text = evidenceSummary(computed).join(' ');
  assert.match(text, /20 jobs by 2 technicians/);
  assert.match(text, /4% of jobs came back within 30 days, against 12% without it: 67% fewer/);
  assert.match(text, /oldest 70% of jobs \(5% vs 12.5%\)/);
  assert.match(text, /where it held: 0% vs 10% across 6 later jobs/);
  assert.match(
    text,
    /promising rather than strong because it has 20 jobs, not 30, 2 technicians use it, not 3 and its significance score is 1.2, under 1.96/,
  );
});

test('an illustrative finding says its numbers were not computed', () => {
  const evidence = { ...computed.evidence, statistics: undefined, demonstration: true };
  const [text] = evidenceSummary({ ...computed, evidence });
  assert.match(text, /illustrative numbers from the sample scenario, not computed from records/);
});

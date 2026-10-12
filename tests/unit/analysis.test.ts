import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Execution } from '../../src/lib/domain/types';
import { evaluatePractice } from '../../src/lib/application/analysis/stats';
import {
  AnalysisToolkit,
  clusterSignals,
  type Embedder,
} from '../../src/lib/application/analysis/toolkit';
import { AnalysisWorker } from '../../src/lib/application/analysis/worker';
import { initialStore, type Store } from '../../src/lib/application/store';
import type { RepositoryProvider } from '../../src/lib/application/ports';

/** 300 jobs by 5 technicians; every third job notes a second seal check and never has a callback. */
function records(): Execution[] {
  return Array.from({ length: 300 }, (_, i) => {
    const practice = i % 3 === 0;
    return {
      id: `job-${i}`,
      technicianId: `tech-${i % 5}`,
      assetId: `a-${i}`,
      equipmentModel: 'V-200',
      jobType: 'valve',
      timestamp: new Date(Date.UTC(2026, 0, 1) + i * 3600_000).toISOString(),
      checklistValues: '',
      partsUsed: '',
      notes: practice
        ? 'Rechecked the seal after 30 seconds'
        : i % 7 === 0
          ? 'Customer not home'
          : '',
      callback: practice ? false : i % 4 === 0,
    };
  });
}
/** Notes with the same first word land together; deterministic stand-in for embeddings. */
const embedder: Embedder = {
  embed: async (texts) => texts.map((t) => (t.startsWith('Rechecked') ? [1, 0] : [0, 1])),
};
const steps = [
  {
    id: 'step-1',
    sequence: 1,
    action: 'Replace seal',
    required: true,
    source: 'baseline' as const,
  },
];

test('a practice with fewer callbacks that holds on later jobs is graded strong', () => {
  const all = records();
  const ids = new Set(all.filter((r) => r.notes.startsWith('Rechecked')).map((r) => r.id));
  const result = evaluatePractice(all, ids);
  assert.equal(result.grade, 'strong');
  assert.equal(result.jobs, 100);
  assert.equal(result.practiceRate, 0);
  assert.equal(result.baselineRate, 25);
  assert.ok(result.heldOut.holds);
});
test('small or non-replicating groups get no grade', () => {
  const all = records();
  assert.equal(evaluatePractice(all, new Set(['job-0', 'job-3'])).grade, null);
  // Callbacks only in the held-out (newest) jobs of the group: fails the later-jobs check.
  const flipped = all.map((r, i) => (i > 240 && i % 3 === 0 ? { ...r, callback: true } : r));
  const ids = new Set(flipped.filter((r) => r.notes.startsWith('Rechecked')).map((r) => r.id));
  assert.equal(evaluatePractice(flipped, ids).grade, null);
});
test('the agent can only propose evaluated, graded practices against real SOP steps', async () => {
  const all = records();
  const clusters = await clusterSignals(all, embedder);
  const kit = new AnalysisToolkit(all, steps, clusters);
  const seal = kit.listClusters().find((c) => c.examples[0].startsWith('Rechecked'))!;
  const proposal = {
    title: 'Recheck',
    standardStepId: 'step-1',
    practice: 'Recheck the seal',
    description: 'x',
  };
  assert.ok('error' in kit.propose({ ...proposal, candidateId: 'p9' }));
  const evaluated = kit.evaluate([seal.clusterId]);
  assert.ok('candidateId' in evaluated);
  assert.ok(
    'error' in
      kit.propose({ ...proposal, candidateId: evaluated.candidateId!, standardStepId: 'step-9' }),
  );
  assert.deepEqual(kit.propose({ ...proposal, candidateId: evaluated.candidateId! }), {
    accepted: true,
    grade: 'strong',
  });
  assert.ok(
    'error' in kit.propose({ ...proposal, candidateId: evaluated.candidateId! }),
    'same jobs twice',
  );
  const noise = kit.listClusters().find((c) => c.clusterId !== seal.clusterId)!;
  const weak = kit.evaluate([noise.clusterId]);
  assert.ok('error' in kit.propose({ ...proposal, candidateId: weak.candidateId! }));
  assert.equal(kit.proposals[0].evaluation.practiceRate, 0);
  assert.deepEqual(kit.funnel(), [300, 2, 2, 1, 1]);
});

function memoryRepositories(store: Store): RepositoryProvider {
  return {
    forTenant: () => ({
      read: async () => store,
      query: async (fn) => fn(store),
      transact: async (fn) => fn(store),
      health: async () => undefined,
    }),
  };
}
function analyzingStore() {
  const store = initialStore('tenant_a', true);
  const process = store.processes.find((p) => p.currentVersion > 0)!;
  process.versions.find((v) => v.version === process.currentVersion)!.steps = steps;
  store.scans.push({
    id: '00000000-0000-4000-8000-000000000001',
    processId: process.id,
    demo: false,
    records: records(),
    status: 'analyzing',
    findingIds: [],
  });
  return store;
}
const job = { organizationId: 'tenant_a', scanId: '00000000-0000-4000-8000-000000000001' };

test('the worker saves findings with code-computed rates and is safe to redeliver', async () => {
  const store = analyzingStore();
  const before = store.findings.length;
  let runs = 0;
  const worker = new AnalysisWorker(
    memoryRepositories(store),
    embedder,
    async (kit) => {
      runs++;
      const seal = kit.listClusters().find((c) => c.examples[0].startsWith('Rechecked'))!;
      const { candidateId } = kit.evaluate([seal.clusterId]) as { candidateId: string };
      kit.propose({
        candidateId,
        title: 'Second seal check',
        standardStepId: 'step-1',
        practice: 'Recheck the seal after 30 seconds',
        description: 'Seen in notes.',
      });
    },
    () => undefined,
  );
  await worker.process(job, false);
  await worker.process(job, false);
  const scan = store.scans[0 + store.scans.length - 1];
  assert.equal(scan.status, 'complete');
  assert.equal(runs, 1);
  assert.equal(store.findings.length, before + 1);
  const finding = store.findings.at(-1)!;
  assert.equal(finding.grade, 'strong');
  assert.equal(finding.practiceRate, 0);
  assert.equal(finding.evidence.demonstration, false);
  assert.equal(finding.evidence.sampleSize, 100);
  assert.deepEqual(scan.funnel, [300, 2, 2, 1, 1]);
});
test('a failing analysis retries, then marks the scan failed on the last attempt', async () => {
  const store = analyzingStore();
  const worker = new AnalysisWorker(
    memoryRepositories(store),
    embedder,
    async () => {
      throw new Error('model down');
    },
    () => undefined,
  );
  await assert.rejects(worker.process(job, false), /model down/);
  assert.equal(store.scans.at(-1)!.status, 'analyzing');
  await worker.process(job, true);
  assert.equal(store.scans.at(-1)!.status, 'failed');
});

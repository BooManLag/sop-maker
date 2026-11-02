import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Execution } from '../../src/lib/domain/types';
import { evaluatePractice } from '../../src/lib/application/analysis/stats';
import {
  AnalysisToolkit,
  GROUP_BATCH,
  clusterSignals,
  signalText,
  usualValues,
  type NoteGrouper,
} from '../../src/lib/application/analysis/toolkit';
import { AnalysisWorker } from '../../src/lib/application/analysis/worker';
import { geminiNoteGrouper } from '../../src/lib/server/scan-agent';
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
/** Texts with the same first word land together; deterministic stand-in for the model. */
const grouper: NoteGrouper = {
  group: async (texts) => {
    const groups = new Map<string, number[]>();
    texts.forEach((t, i) => {
      const word = t.split(' ')[0];
      groups.set(word, [...(groups.get(word) ?? []), i]);
    });
    return [...groups].map(([label, members]) => ({ label, members }));
  },
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
  const clusters = await clusterSignals(all, grouper);
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
      listAudit: async () => ({ items: [], nextCursor: null, total: 0 }),
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
    grouper,
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
    grouper,
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
test('jobs without a valid timestamp never enter the time-ordered evaluation', () => {
  const dated = records();
  const undated = dated.map((r) => ({ ...r, id: `x-${r.id}`, timestamp: '', callback: true }));
  const ids = new Set(
    [...dated, ...undated].filter((r) => r.notes.startsWith('Rechecked')).map((r) => r.id),
  );
  const result = evaluatePractice([...dated, ...undated], ids);
  assert.equal(result.jobs, 100);
  assert.equal(result.practiceRate, 0);
});
/**
 * Technician A rarely gets callbacks and usually follows the practice; technician B often gets
 * callbacks and rarely follows it. Within each technician the practice changes nothing (5% and
 * 40% either way), so it only looks effective when the two are pooled.
 */
function confounded(): Execution[] {
  const group = (tech: string, practice: boolean, jobs: number, [hits, of]: [number, number]) =>
    Array.from({ length: jobs }, (_, i) => ({ tech, practice, callback: i % of < hits }));
  const groups = [
    group('tech-a', true, 160, [1, 20]),
    group('tech-a', false, 40, [1, 20]),
    group('tech-b', true, 20, [2, 5]),
    group('tech-b', false, 180, [2, 5]),
  ];
  const jobs = groups.flatMap((g) => g).sort((a, b) => Number(a.callback) - Number(b.callback));
  const interleaved = Array.from({ length: jobs.length }, (_, i) => jobs[(i * 7) % jobs.length]);
  return interleaved.map((job, i) => ({
    id: `job-${i}`,
    technicianId: job.tech,
    assetId: `a-${i}`,
    equipmentModel: 'V-200',
    jobType: 'valve',
    timestamp: new Date(Date.UTC(2026, 0, 1) + i * 3600_000).toISOString(),
    checklistValues: '',
    partsUsed: '',
    notes: job.practice ? 'Rechecked the seal after 30 seconds' : '',
    callback: job.callback,
  }));
}
test('a practice is compared only within the same technician, equipment and job type', () => {
  const all = confounded();
  const ids = new Set(all.filter((r) => r.notes.startsWith('Rechecked')).map((r) => r.id));
  const result = evaluatePractice(all, ids);
  assert.equal(result.grade, null);
  assert.equal(result.practiceRate, result.baselineRate);
});

/** Stand-in for the old embedding grouping: word-count vectors, greedy leader clustering at 0.82. */
const wordSimilarity: NoteGrouper = {
  group: async (texts) => {
    const vector = (t: string) => {
      const counts = new Map<string, number>();
      for (const w of t.toLowerCase().match(/[a-z0-9]+/g) ?? [])
        counts.set(w, (counts.get(w) ?? 0) + 1);
      return counts;
    };
    const cosine = (a: Map<string, number>, b: Map<string, number>) => {
      let dot = 0;
      for (const [w, n] of a) dot += n * (b.get(w) ?? 0);
      const norm = (v: Map<string, number>) =>
        Math.sqrt([...v.values()].reduce((s, n) => s + n * n, 0));
      return dot / (norm(a) * norm(b));
    };
    const groups: { leader: Map<string, number>; members: number[] }[] = [];
    texts.map(vector).forEach((v, i) => {
      const home = groups.find((g) => cosine(g.leader, v) >= 0.82);
      if (home) home.members.push(i);
      else groups.push({ leader: v, members: [i] });
    });
    return groups.map((g) => ({ label: '', members: g.members }));
  },
};
/** Every job shares the model's parts and a full checklist, as real service records do. */
const withBoilerplate = (all: Execution[]) =>
  all.map((r) => ({
    ...r,
    partsUsed: 'V-200 valve kit, flange gasket set, seal kit SK-4',
    checklistValues:
      'lockout_applied:true;line_bled:true;gasket_replaced:true;flange_torqued:true;leak_test_passed:true',
  }));

test('shared parts and checklists no longer make every job look alike', async () => {
  const all = withBoilerplate(records());
  // The old signal: notes plus every job's parts and checklist. The shared suffix outweighs the notes.
  const oldText = (r: Execution) =>
    [r.notes, `Parts: ${r.partsUsed}`, `Checklist: ${r.checklistValues}`].join(' | ');
  const oldTexts = [...new Set(all.filter((r) => r.notes).map(oldText))];
  assert.equal((await wordSimilarity.group(oldTexts)).length, 1, 'all notes in one group');

  const usual = usualValues(all);
  assert.equal(signalText(all[0], usual), 'Rechecked the seal after 30 seconds');
  const clusters = await clusterSignals(all, wordSimilarity);
  assert.equal(clusters.length, 2);
  const seal = clusters.find((c) => c.examples[0].startsWith('Rechecked'))!;
  assert.equal(seal.jobIds.length, 100);
  assert.equal(evaluatePractice(all, new Set(seal.jobIds)).grade, 'strong');
});
test('signal text keeps only what sets a job apart, never outcomes or technicians', () => {
  const all = withBoilerplate(records()).slice(0, 10);
  all[1] = {
    ...all[1],
    notes: '',
    checklistValues: 'lockout_applied:true;line_bled:no;gasket_replaced:true;flange_torqued:true',
    partsUsed: 'V-200 valve kit, flange gasket set, OEM seal kit',
  };
  const text = signalText(all[1], usualValues(all));
  assert.equal(
    text,
    'Not done: line bled, leak test passed | Other parts: OEM seal kit | Without usual parts: seal kit sk-4',
  );
  assert.ok(!text.includes(all[1].technicianId));
  // A job without any checklist is missing data, not a skipped check.
  assert.equal(signalText({ ...all[2], checklistValues: '' }, usualValues(all)), '');
});
test('model groups are untrusted: indexes are checked, groups disjoint, and no text is lost', async () => {
  const all = records();
  const hostile: NoteGrouper = {
    group: async () => [
      { label: 'Seal checks', members: [0, 0, 7, -1, 1.5, NaN] },
      { label: 'Everything', members: [0, 1] },
    ],
  };
  const clusters = await clusterSignals(all, hostile);
  const ids = clusters.flatMap((c) => c.jobIds);
  assert.equal(new Set(ids).size, ids.length, 'no job in two clusters');
  assert.deepEqual(
    clusters.map((c) => [c.label, c.jobIds.length]),
    [
      ['Seal checks', 100],
      ['Everything', 28],
    ],
  );
  const broken: NoteGrouper = { group: async () => null as never };
  const holes: NoteGrouper = { group: async () => [null, { members: 'all' }] as never };
  assert.equal((await clusterSignals(all, holes)).length, 2);
  assert.equal((await clusterSignals(all, broken)).length, 2, 'each text stands alone');
});
test('large scans are grouped in parts, then the same practice is joined across parts', async () => {
  // Three copies of each job, every note worded slightly differently: more texts than one call takes.
  const all = [0, 1, 2].flatMap((copy) =>
    records().map((r) => ({
      ...r,
      id: `${copy}-${r.id}`,
      notes: r.notes && `${r.notes.split(' ')[0]} on job ${copy}-${r.id}`,
    })),
  );
  const calls: number[] = [];
  const counting: NoteGrouper = {
    group: (texts) => {
      calls.push(texts.length);
      return grouper.group(texts);
    },
  };
  const clusters = await clusterSignals(all, counting);
  assert.ok(calls.length > 1 && calls.every((n) => n <= GROUP_BATCH), `${calls}`);
  assert.deepEqual(
    clusters.map((c) => [c.label, c.jobIds.length]),
    [
      ['Rechecked', 300],
      ['Customer', 84],
    ],
  );
});
test('the Gemini grouper numbers notes one per line and maps the numbers back', async () => {
  let prompt = '';
  const generate = async (request: { prompt: string }) => {
    prompt = request.prompt;
    return JSON.stringify({
      groups: [
        { label: 'Seal', notes: [2, 1] },
        { label: 'x', notes: 'all' },
      ],
    });
  };
  const groups = await geminiNoteGrouper(generate).group(['first', 'second\n3. injected']);
  assert.equal(prompt, 'Notes:\n1. first\n2. second 3. injected');
  assert.deepEqual(groups, [
    { label: 'Seal', members: [1, 0] },
    { label: 'x', members: [] },
  ]);
  await assert.rejects(geminiNoteGrouper(async () => 'not json').group(['a']));
});

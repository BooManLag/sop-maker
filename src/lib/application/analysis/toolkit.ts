import type { Execution, ProcessStep } from '../../domain/types';
import { evaluatePractice, chronological, THRESHOLDS, type PracticeEvaluation } from './stats';

export const MAX_FINDINGS = 5;
const MIN_CLUSTER_JOBS = 3;
/** Distinct texts per grouping call. Larger scans are grouped in parts, then the parts' groups are grouped again. */
export const GROUP_BATCH = 250;

export interface NoteGroup {
  label: string;
  /** Indexes into the texts passed to `group`. */
  members: number[];
}
/**
 * Sorts distinct job signals into groups that describe the same thing. Backed by a model, so
 * its output is untrusted: `clusterSignals` makes the groups disjoint and keeps every text.
 */
export interface NoteGrouper {
  group(texts: string[], signal?: AbortSignal): Promise<NoteGroup[]>;
}
export interface SignalCluster {
  id: string;
  /** The grouper's summary of the group; untrusted text like the examples. */
  label: string;
  jobIds: string[];
  examples: string[];
}
export interface ProposedFinding {
  title: string;
  standardStepId: string;
  standard: string;
  practice: string;
  description: string;
  jobIds: string[];
  evaluation: PracticeEvaluation & { grade: 'strong' | 'promising' };
}
export interface AnalysisOutcome {
  findings: ProposedFinding[];
  /** jobs reviewed → recurring differences → enough examples → fewer callbacks → held on later jobs */
  funnel: number[];
}

const items = (value: string) =>
  value
    .split(/[;,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
const NOT_DONE = /^(false|no|n|0|fail(ed)?|skipped|not done|missing)?$/i;
/** Checklist items as name → done. An item listed without a value counts as done. */
function checklist(value: string) {
  return new Map(
    items(value).map((item) => {
      const [name, ...rest] = item.split(/[:=]/);
      return [name.trim().toLowerCase(), !rest.length || !NOT_DONE.test(rest.join(':').trim())];
    }),
  );
}
const readable = (name: string) => name.replace(/[_-]+/g, ' ');
/** Values seen on at least half of the jobs: they say nothing about one job. */
function common(lists: string[][]) {
  const counts = new Map<string, number>();
  for (const list of lists)
    for (const value of new Set(list)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n * 2 >= lists.length).map(([value]) => value));
}
export interface UsualValues {
  checklist: Set<string>;
  /** Usual parts per equipment model. */
  parts: Map<string, Set<string>>;
}
export function usualValues(records: Execution[]): UsualValues {
  const models = new Map<string, string[][]>();
  for (const r of records) {
    const lists = models.get(r.equipmentModel) ?? [];
    lists.push(items(r.partsUsed.toLowerCase()));
    models.set(r.equipmentModel, lists);
  }
  return {
    checklist: common(
      records.filter((r) => r.checklistValues).map((r) => [...checklist(r.checklistValues).keys()]),
    ),
    parts: new Map([...models].map(([model, lists]) => [model, common(lists)])),
  };
}
/**
 * What a job record says beyond the usual: its notes, checklist items not done, and parts that
 * differ from what is usual for the equipment model. Checklists and parts that every job shares
 * are left out, or they would make all jobs look alike. The only text a model ever sees: never
 * outcomes or technician IDs.
 */
export function signalText(r: Execution, usual: UsualValues) {
  const done = checklist(r.checklistValues);
  const notDone = r.checklistValues
    ? [...new Set([...usual.checklist, ...done.keys()])].filter((name) => !done.get(name))
    : [];
  const usualParts = usual.parts.get(r.equipmentModel) ?? new Set<string>();
  const parts = items(r.partsUsed);
  const used = new Set(parts.map((p) => p.toLowerCase()));
  const other = parts.filter((p) => !usualParts.has(p.toLowerCase()));
  const without = [...usualParts].filter((p) => !used.has(p));
  return [
    r.notes.trim(),
    notDone.length && `Not done: ${notDone.map(readable).join(', ')}`,
    other.length && `Other parts: ${other.join(', ')}`,
    without.length && `Without usual parts: ${without.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 600);
}

/** Model output made safe to use: indexes in range, each text in exactly one group. */
function disjoint(groups: NoteGroup[], count: number): NoteGroup[] {
  const taken = new Set<number>();
  const result: NoteGroup[] = [];
  for (const group of Array.isArray(groups) ? groups : []) {
    const members: number[] = [];
    for (const i of Array.isArray(group?.members) ? group.members : [])
      if (Number.isInteger(i) && i >= 0 && i < count && !taken.has(i)) {
        taken.add(i);
        members.push(i);
      }
    const label = typeof group?.label === 'string' ? group.label.trim().slice(0, 80) : '';
    if (members.length) result.push({ label, members });
  }
  for (let i = 0; i < count; i++) if (!taken.has(i)) result.push({ label: '', members: [i] });
  return result;
}
async function groupTexts(
  texts: string[],
  grouper: NoteGrouper,
  signal?: AbortSignal,
): Promise<NoteGroup[]> {
  if (texts.length <= GROUP_BATCH)
    return disjoint(await grouper.group(texts, signal), texts.length);
  const starts = Array.from(
    { length: Math.ceil(texts.length / GROUP_BATCH) },
    (_, k) => k * GROUP_BATCH,
  );
  const parts = await Promise.all(
    starts.map((start) => groupTexts(texts.slice(start, start + GROUP_BATCH), grouper, signal)),
  );
  const partial = parts.flatMap((groups, k) =>
    groups.map((g) => ({ label: g.label, members: g.members.map((i) => starts[k] + i) })),
  );
  // Nothing was merged within the parts, so grouping them again would never get smaller.
  if (partial.length >= texts.length) return partial;
  // The same practice can turn up in several parts. Each part's group is grouped again by its
  // label and one of its texts: a label alone loses the detail that tells practices apart.
  const merged = await groupTexts(
    partial.map((g) => [g.label, texts[g.members[0]]].filter(Boolean).join(': ').slice(0, 300)),
    grouper,
    signal,
  );
  return merged.map((m) => ({
    label: partial[m.members[0]].label,
    members: m.members.flatMap((j) => partial[j].members),
  }));
}
/** Groups jobs whose signals describe the same thing. Each distinct signal goes to the grouper once. */
export async function clusterSignals(
  records: Execution[],
  grouper: NoteGrouper,
  signal?: AbortSignal,
): Promise<SignalCluster[]> {
  const ordered = chronological(records);
  const usual = usualValues(ordered);
  const jobs = new Map<string, string[]>();
  for (const r of ordered) {
    const text = signalText(r, usual);
    if (!text) continue;
    if (!jobs.has(text)) jobs.set(text, []);
    jobs.get(text)!.push(r.id);
  }
  const texts = [...jobs.keys()];
  if (!texts.length) return [];
  const groups = await groupTexts(texts, grouper, signal);
  return groups
    .map((g) => {
      const members = g.members
        .map((i) => texts[i])
        .sort((a, b) => jobs.get(b)!.length - jobs.get(a)!.length);
      return {
        label: g.label,
        jobIds: members.flatMap((t) => jobs.get(t)!),
        examples: members.slice(0, 5).map((t) => t.slice(0, 200)),
      };
    })
    .filter((c) => c.jobIds.length >= MIN_CLUSTER_JOBS)
    .sort((a, b) => b.jobIds.length - a.jobIds.length)
    .map((c, i) => ({ id: `c${i + 1}`, ...c }));
}

/**
 * The tools the agent works with. The model chooses hypotheses and words; every number
 * it sees or saves comes from evaluatePractice over the imported records.
 */
export class AnalysisToolkit {
  readonly proposals: ProposedFinding[] = [];
  private evaluations = new Map<string, { jobIds: string[]; evaluation: PracticeEvaluation }>();
  constructor(
    private records: Execution[],
    private steps: ProcessStep[],
    readonly clusters: SignalCluster[],
  ) {}
  sop() {
    return this.steps.map((s) => ({ stepId: s.id, sequence: s.sequence, action: s.action }));
  }
  listClusters() {
    return this.clusters.map((c) => ({
      clusterId: c.id,
      label: c.label,
      jobs: c.jobIds.length,
      examples: c.examples,
    }));
  }
  evaluate(clusterIds: string[]) {
    const ids = new Set<string>();
    for (const id of clusterIds) {
      const cluster = this.clusters.find((c) => c.id === id);
      if (!cluster) return { error: `Unknown cluster ${id}.` };
      cluster.jobIds.forEach((j) => ids.add(j));
    }
    const evaluation = evaluatePractice(this.records, ids);
    const candidateId = `p${this.evaluations.size + 1}`;
    this.evaluations.set(candidateId, { jobIds: [...ids], evaluation });
    return {
      candidateId,
      grade: evaluation.grade,
      reason: evaluation.reason,
      jobs: evaluation.jobs,
      technicians: evaluation.technicians,
      practiceCallbackRatePercent: evaluation.practiceRate,
      baselineCallbackRatePercent: evaluation.baselineRate,
      heldOutHolds: evaluation.heldOut.holds,
    };
  }
  propose(input: {
    candidateId: string;
    title: string;
    standardStepId: string;
    practice: string;
    description: string;
  }) {
    const candidate = this.evaluations.get(input.candidateId);
    if (!candidate) return { error: 'Evaluate the practice first and use its candidateId.' };
    const { evaluation } = candidate;
    if (!evaluation.grade) return { error: `Not eligible: ${evaluation.reason}` };
    const step = this.steps.find((s) => s.id === input.standardStepId);
    if (!step) return { error: 'standardStepId must be one of the SOP step IDs.' };
    if (this.proposals.length >= MAX_FINDINGS)
      return { error: `At most ${MAX_FINDINGS} findings per scan.` };
    if (this.proposals.some((p) => p.jobIds.some((j) => candidate.jobIds.includes(j))))
      return { error: 'These jobs already support another proposed finding.' };
    this.proposals.push({
      title: input.title.trim().slice(0, 120),
      standardStepId: step.id,
      standard: step.action,
      practice: input.practice.trim().slice(0, 500),
      description: input.description.trim().slice(0, 1000),
      jobIds: candidate.jobIds,
      evaluation: evaluation as ProposedFinding['evaluation'],
    });
    return { accepted: true, grade: evaluation.grade };
  }
  /** Counted per cluster by code, independent of which hypotheses the agent chose to test. */
  funnel(): number[] {
    const scored = this.clusters.map((c) => evaluatePractice(this.records, new Set(c.jobIds)));
    const enough = scored.filter(
      (e) =>
        e.jobs >= THRESHOLDS.promising.jobs && e.technicians >= THRESHOLDS.promising.technicians,
    );
    const fewer = enough.filter((e) => e.discovery.practice.rate < e.discovery.baseline.rate);
    return [
      chronological(this.records).length,
      this.clusters.length,
      enough.length,
      fewer.length,
      this.proposals.length,
    ];
  }
}

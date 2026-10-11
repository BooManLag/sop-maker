import type { Execution, ProcessStep } from '../../domain';
import { evaluatePractice, chronological, THRESHOLDS, type PracticeEvaluation } from './stats';

export const MAX_FINDINGS = 5;
const CLUSTER_SIMILARITY = 0.82;
const MIN_CLUSTER_JOBS = 3;

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}
export interface SignalCluster {
  id: string;
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

/** What a job record says beyond the SOP: the only text the model ever sees, never outcomes or technician IDs. */
export function signalText(r: Execution) {
  return [
    r.notes,
    r.partsUsed && `Parts: ${r.partsUsed}`,
    r.checklistValues && `Checklist: ${r.checklistValues}`,
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 600);
}
function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
/** Greedy leader clustering: a scan holds at most a few thousand jobs, so in-memory similarity is enough. */
export async function clusterSignals(
  records: Execution[],
  embedder: Embedder,
): Promise<SignalCluster[]> {
  const withText = chronological(records).filter((r) => signalText(r).trim());
  if (!withText.length) return [];
  const vectors = await embedder.embed(withText.map(signalText));
  const clusters: { leader: number[]; members: Execution[] }[] = [];
  withText.forEach((record, i) => {
    const home = clusters.find((c) => cosine(c.leader, vectors[i]) >= CLUSTER_SIMILARITY);
    if (home) home.members.push(record);
    else clusters.push({ leader: vectors[i], members: [record] });
  });
  return clusters
    .filter((c) => c.members.length >= MIN_CLUSTER_JOBS)
    .sort((a, b) => b.members.length - a.members.length)
    .map((c, i) => ({
      id: `c${i + 1}`,
      jobIds: c.members.map((m) => m.id),
      examples: c.members.slice(0, 5).map((m) => signalText(m).slice(0, 200)),
    }));
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

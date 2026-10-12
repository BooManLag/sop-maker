import type { Execution } from '../../domain/types';

/** Share of jobs (oldest first) used to discover a practice; the newest jobs are held out to check it. */
export const DISCOVERY_SHARE = 0.7;
export const THRESHOLDS = Object.freeze({
  promising: { jobs: 10, technicians: 2, minReduction: 0.1 },
  strong: { jobs: 30, technicians: 3, minReduction: 0.2, z: 1.96 },
});

export interface GroupRate {
  jobs: number;
  callbacks: number;
  rate: number;
}
export interface PracticeEvaluation {
  jobs: number;
  technicians: number;
  discovery: { practice: GroupRate; baseline: GroupRate; z: number };
  heldOut: { practice: GroupRate; baseline: GroupRate; holds: boolean };
  /** Percentages (0-100, one decimal) over all observed jobs, as stored on findings. */
  practiceRate: number;
  baselineRate: number;
  grade: 'strong' | 'promising' | null;
  reason: string;
}

const rate = (records: Execution[]): GroupRate => {
  const callbacks = records.filter((r) => r.callback).length;
  return { jobs: records.length, callbacks, rate: records.length ? callbacks / records.length : 0 };
};
const percent = (value: number) => Math.round(value * 1000) / 10;
/** Two-proportion z statistic; positive when the practice has fewer callbacks than the baseline. */
function zScore(practice: GroupRate, baseline: GroupRate) {
  const total = practice.jobs + baseline.jobs;
  if (!practice.jobs || !baseline.jobs) return 0;
  const pooled = (practice.callbacks + baseline.callbacks) / total;
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / practice.jobs + 1 / baseline.jobs));
  return se ? (baseline.rate - practice.rate) / se : 0;
}

export function chronological(records: Execution[]) {
  const observed = records.filter((r) => r.callback !== null);
  return [...observed].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id),
  );
}

/** Scores the jobs that followed a practice against all other jobs. Every number on a finding comes from here. */
export function evaluatePractice(
  records: Execution[],
  practiceIds: Set<string>,
): PracticeEvaluation {
  const ordered = chronological(records);
  const cut = Math.floor(ordered.length * DISCOVERY_SHARE);
  const split = (rows: Execution[]) => ({
    practice: rate(rows.filter((r) => practiceIds.has(r.id))),
    baseline: rate(rows.filter((r) => !practiceIds.has(r.id))),
  });
  const discovery = split(ordered.slice(0, cut));
  const heldOut = split(ordered.slice(cut));
  const all = split(ordered);
  const followers = ordered.filter((r) => practiceIds.has(r.id));
  const technicians = new Set(followers.map((r) => r.technicianId).filter(Boolean)).size;
  const z = zScore(discovery.practice, discovery.baseline);
  const reduction = (g: { practice: GroupRate; baseline: GroupRate }) =>
    g.baseline.rate ? (g.baseline.rate - g.practice.rate) / g.baseline.rate : 0;
  const holds = heldOut.practice.jobs > 0 && heldOut.practice.rate < heldOut.baseline.rate;
  const { strong, promising } = THRESHOLDS;
  let grade: PracticeEvaluation['grade'] = null;
  let reason: string;
  if (followers.length < promising.jobs || technicians < promising.technicians)
    reason = `Too few examples: ${followers.length} jobs by ${technicians} technicians.`;
  else if (reduction(discovery) < promising.minReduction)
    reason = 'Not associated with fewer callbacks on earlier jobs.';
  else if (!holds) reason = 'Did not hold up on the held-out later jobs.';
  else if (
    followers.length >= strong.jobs &&
    technicians >= strong.technicians &&
    reduction(discovery) >= strong.minReduction &&
    z >= strong.z
  ) {
    grade = 'strong';
    reason = 'Fewer callbacks on earlier jobs, significant, and held on later jobs.';
  } else {
    grade = 'promising';
    reason = 'Fewer callbacks that held on later jobs, but evidence is not yet strong.';
  }
  return {
    jobs: followers.length,
    technicians,
    discovery: { ...discovery, z: Math.round(z * 100) / 100 },
    heldOut: { ...heldOut, holds },
    practiceRate: percent(all.practice.rate),
    baselineRate: percent(all.baseline.rate),
    grade,
    reason,
  };
}

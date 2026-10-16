import type { Finding } from './types';

/** Percentage of baseline callbacks avoided when the practice is used. */
export function relativeReduction({
  baselineRate,
  practiceRate,
}: Pick<Finding, 'baselineRate' | 'practiceRate'>) {
  if (baselineRate <= 0) return 0;
  return Math.round(((baselineRate - practiceRate) / baselineRate) * 100);
}

/** A finding nobody has looked at yet: it waits for a person to investigate or dismiss it. */
export const needsReview = (finding: Pick<Finding, 'status'>) => finding.status === 'candidate';

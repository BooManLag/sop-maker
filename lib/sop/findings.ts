import type { Finding } from '../domain';

/** Percentage of baseline callbacks avoided when the practice is used. */
export function relativeReduction({
  baselineRate,
  practiceRate,
}: Pick<Finding, 'baselineRate' | 'practiceRate'>) {
  if (baselineRate <= 0) return 0;
  return Math.round(((baselineRate - practiceRate) / baselineRate) * 100);
}

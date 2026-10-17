import { DISCOVERY_SHARE, THRESHOLDS } from '@/lib/application/analysis/stats';
import { relativeReduction } from '@/lib/domain/findings';
import type { Finding } from '@/lib/domain/types';

const later = Math.round((1 - DISCOVERY_SHARE) * 100);
const earlier = 100 - later;
const reductionOf = (practice: number, baseline: number) =>
  relativeReduction({ practiceRate: practice, baselineRate: baseline });

/** Why the bar for "strong" was not met, in the reader's terms. */
function shortfalls(finding: Finding, z: number, earlierReduction: number) {
  const { strong } = THRESHOLDS;
  const gaps: string[] = [];
  if (finding.evidence.sampleSize < strong.jobs)
    gaps.push(`it has ${finding.evidence.sampleSize} jobs, not ${strong.jobs}`);
  if (finding.technicians < strong.technicians)
    gaps.push(`${finding.technicians} technicians use it, not ${strong.technicians}`);
  if (earlierReduction < strong.minReduction * 100)
    gaps.push(
      `the reduction on earlier jobs is ${earlierReduction}%, under ${strong.minReduction * 100}%`,
    );
  if (z < strong.z) gaps.push(`its significance score is ${z}, under ${strong.z}`);
  return gaps;
}

const list = (items: string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** Plain-language paragraphs explaining a finding's numbers and grade. */
export function evidenceSummary(finding: Finding): string[] {
  const { evidence } = finding;
  const reduction = relativeReduction(finding);
  if (!evidence.statistics)
    return [
      `These are illustrative numbers from the sample scenario, not computed from records: ${finding.technicians} technicians, ${evidence.sampleSize} comparable jobs, and ${finding.practiceRate}% of jobs coming back within 30 days with the practice against ${finding.baselineRate}% without it.`,
    ];
  const { discovery, heldOut, z } = evidence.statistics;
  const earlierReduction = reductionOf(discovery.practiceRate, discovery.baselineRate);
  const { strong } = THRESHOLDS;
  const held = heldOut.practiceJobs > 0 && heldOut.practiceRate < heldOut.baselineRate;
  const grade =
    finding.grade === 'strong'
      ? `It is graded strong because it clears every bar: at least ${strong.jobs} jobs (it has ${evidence.sampleSize}), ${strong.technicians} technicians (${finding.technicians}), a ${strong.minReduction * 100}% reduction on earlier jobs (${earlierReduction}%) and a significance score of at least ${strong.z} (${z}).`
      : `It is graded promising rather than strong because ${list(shortfalls(finding, z, earlierReduction))}.`;
  return [
    `${evidence.sampleSize} jobs by ${finding.technicians} technicians recorded this practice in their notes. Each job was compared only with the same technician's other jobs on the same equipment and job type, so differences between people or machines do not explain the result.`,
    `With the practice, ${finding.practiceRate}% of jobs came back within 30 days, against ${finding.baselineRate}% without it: ${reduction}% fewer callbacks.`,
    `The pattern was found on the oldest ${earlier}% of jobs (${discovery.practiceRate}% vs ${discovery.baselineRate}%) and then checked on the newest ${later}%, ${held ? `where it held: ${heldOut.practiceRate}% vs ${heldOut.baselineRate}% across ${heldOut.practiceJobs} later jobs with the practice` : 'where it did not hold'}.`,
    grade,
    'This is a historical association, not proof that the practice causes fewer callbacks. A controlled trial is how to test that.',
  ];
}

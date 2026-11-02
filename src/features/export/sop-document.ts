import type { ProcessDto } from '@/lib/client/api';
import type { ProcessStep } from '@/lib/domain/types';

/**
 * One page model for every export format, so the deck and the PDF cannot drift apart. Holds only
 * what a reader needs; internal fields such as who approved never reach it.
 */
export interface SopDocument {
  title: {
    title: string;
    equipment: string;
    version: string;
    approval: string;
    generatedAt: string;
    evidence: string[];
  };
  /** Document-control facts printed in the SOP header and control table. */
  control: {
    /** Stable identifier derived from the process, so printed copies can be traced. */
    documentId: string;
    /** Date this version was created, as YYYY-MM-DD. */
    versionDate: string;
    approved: boolean;
    published: boolean;
  };
  /** Every version of the process, oldest first. */
  revisions: SopRevision[];
  /** Shown on every page so an exported file never loses its context. */
  labels: ('DRAFT' | 'DEMO')[];
  steps: SopPage[];
  /** Base name for the downloaded file, without extension. */
  fileName: string;
}
export interface SopPage {
  id: string;
  number: number;
  action: string;
  details: { label: string; text: string }[];
  hasImage: boolean;
  required: boolean;
  /** Expected time, such as "3–5 min", when the expert recorded one. */
  duration?: string;
  /** Set when the step came from a validated field trial rather than the original walkthrough. */
  validated: boolean;
}
export interface SopRevision {
  version: number;
  date: string;
  status: 'Draft' | 'Approved' | 'Awaiting approval';
  change: string;
}

const detailFields = [
  ['condition', 'Use when'],
  ['rationale', 'Why'],
  ['warning', 'Warning'],
  ['evidence', 'Done when'],
] as const;

export function buildSopDocument(
  process: ProcessDto,
  options: { demo: boolean; generatedAt: Date; steps?: ProcessStep[] },
): SopDocument {
  const version = process.versions.at(-1)!;
  const published = version.status === 'published';
  return {
    title: {
      title: process.title,
      equipment: process.equipment,
      version: published ? `Version ${version.version}` : 'Draft',
      approval: version.approved ? 'Approved' : 'Awaiting approval',
      generatedAt: formatUtc(options.generatedAt),
      evidence: [
        version.findingId && `Finding ${version.findingId}`,
        version.trialId && `Trial ${version.trialId}`,
      ].filter((ref): ref is string => !!ref),
    },
    control: {
      documentId: `SOP-${process.id
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 8)
        .toUpperCase()}`,
      versionDate: version.createdAt.slice(0, 10),
      approved: version.approved,
      published,
    },
    revisions: process.versions.map((v) => ({
      version: v.version,
      date: v.createdAt.slice(0, 10),
      status: v.status === 'draft' ? 'Draft' : v.approved ? 'Approved' : 'Awaiting approval',
      change: v.trialId
        ? 'Updated with a practice validated in a controlled trial'
        : v.version === 1
          ? 'First issue, captured from expert walkthrough'
          : 'Revised',
    })),
    labels: [...(published ? [] : ['DRAFT' as const]), ...(options.demo ? ['DEMO' as const] : [])],
    steps: (options.steps ?? version.steps).map(toPage),
    fileName: `${slug(process.title)}-${published ? `v${version.version}` : 'draft'}`,
  };
}

function toPage(step: ProcessStep, index: number): SopPage {
  return {
    id: step.id,
    number: index + 1,
    action: step.action,
    details: detailFields.flatMap(([field, label]) =>
      step[field] ? [{ label, text: step[field] }] : [],
    ),
    hasImage: !!step.frameObjectPath,
    required: step.required,
    ...(durationText(step) ? { duration: durationText(step) } : {}),
    validated: step.source === 'validated_field_practice',
  };
}
function durationText({ durationMinSeconds: min, durationMaxSeconds: max }: ProcessStep) {
  const format = (seconds: number) =>
    seconds < 60
      ? `${seconds} s`
      : `${Math.round((seconds / 60) * 10) / 10} min`.replace('.0 ', ' ');
  if (min !== undefined && max !== undefined && min !== max) {
    const [a, b] = [format(min), format(max)];
    return a.split(' ')[1] === b.split(' ')[1] ? `${a.split(' ')[0]}–${b}` : `${a}–${b}`;
  }
  const only = min ?? max;
  return only === undefined ? undefined : format(only);
}
const formatUtc = (date: Date) => `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'sop';

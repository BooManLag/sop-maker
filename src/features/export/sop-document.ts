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
  };
}
const formatUtc = (date: Date) => `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'sop';

import type { Workspace } from '@/lib/client/api';
import { needsReview } from '@/lib/domain/findings';

export type StepState = 'done' | 'current' | 'todo';

/** What a step has achieved so far, before its place in the track is known. */
type Milestone = { label: string; done: boolean; doneDetail: string; pendingDetail: string };

export type Step = { label: string; detail: string; state: StepState };

export type Track = {
  eyebrow: string;
  title: string;
  steps: Step[];
  action: { label: string; href: string; emphasis: 'primary' | 'secondary' };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Every milestone before the first unfinished one is done; that one is current. */
function toSteps(milestones: Milestone[]): Step[] {
  const firstUnfinished = milestones.findIndex((m) => !m.done);
  return milestones.map((m, i) => {
    const state: StepState =
      firstUnfinished === -1 || i < firstUnfinished
        ? 'done'
        : i === firstUnfinished
          ? 'current'
          : 'todo';
    return { label: m.label, state, detail: state === 'done' ? m.doneDetail : m.pendingDetail };
  });
}

export function createTrack({ processes }: Workspace): Track {
  const drafted = processes.filter((p) => p.versions.length > 0).length;
  const published = processes.filter((p) => p.currentVersion > 0).length;
  return {
    eyebrow: '01 / CREATE',
    title: 'Start with your best know-how.',
    steps: toSteps([
      {
        label: 'Capture',
        done: processes.length > 0,
        doneDetail: plural(processes.length, 'process'),
        pendingDetail: 'Not yet',
      },
      { label: 'Clarify', done: drafted > 0, doneDetail: 'Done', pendingDetail: 'Not yet' },
      {
        label: 'Review & publish',
        done: published > 0,
        doneDetail: `${published} published`,
        pendingDetail: 'Not yet',
      },
    ]),
    action: {
      label: processes.length ? 'Capture a process' : 'Create first SOP',
      href: '/processes/new',
      emphasis: published ? 'secondary' : 'primary',
    },
  };
}

export function improveTrack({ findings, trials }: Workspace): Track {
  const toReview = findings.filter(needsReview).length;
  const reviewed = findings.length - toReview;
  const completedTrials = trials.filter((t) => t.status === 'complete').length;
  return {
    eyebrow: '02 / IMPROVE',
    title: 'Your next improvement is in the field.',
    steps: toSteps([
      {
        label: 'Scan',
        done: findings.length > 0,
        doneDetail: plural(findings.length, 'finding'),
        pendingDetail: 'Not yet',
      },
      {
        label: 'Find',
        done: findings.length > 0 && toReview === 0,
        doneDetail: `${reviewed} reviewed`,
        pendingDetail: `${toReview} to review`,
      },
      {
        label: 'Validate',
        done: completedTrials > 0,
        doneDetail: `${completedTrials} complete`,
        pendingDetail: plural(trials.length, 'trial'),
      },
    ]),
    action: toReview
      ? { label: `Review ${plural(toReview, 'finding')}`, href: '/findings', emphasis: 'primary' }
      : { label: 'Scan service records', href: '/scans/new', emphasis: 'secondary' },
  };
}

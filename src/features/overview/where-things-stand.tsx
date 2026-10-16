'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import type { Workspace } from '@/lib/client/api';
import { useWorkspace } from '@/lib/client/queries';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'current' | 'todo';
type Step = { label: string; detail: string; state: StepState };
type Track = {
  eyebrow: string;
  title: string;
  steps: Step[];
  cta: string;
  href: string;
  primary: boolean;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Marks every step before the first unfinished one as done, and that one as current. */
function progress(steps: { label: string; detail: string; done: boolean }[]): Step[] {
  const current = steps.findIndex((step) => !step.done);
  return steps.map(({ label, detail }, i) => ({
    label,
    detail,
    state: current === -1 || i < current ? 'done' : i === current ? 'current' : 'todo',
  }));
}

function createTrack(data: Workspace): Track {
  const processes = data.processes.length;
  const published = data.processes.filter((p) => p.currentVersion > 0).length;
  return {
    eyebrow: '01 / CREATE',
    title: 'Start with your best know-how.',
    steps: progress([
      { label: 'Capture', detail: plural(processes, 'process'), done: processes > 0 },
      { label: 'Clarify', detail: published ? 'Done' : 'Next up', done: published > 0 },
      { label: 'Review & publish', detail: `${published} published`, done: published > 0 },
    ]),
    cta: processes ? 'Capture a process' : 'Create first SOP',
    href: '/processes/new',
    primary: published === 0,
  };
}

function improveTrack(data: Workspace): Track {
  const openFindings = data.findings.filter((f) => f.status !== 'dismissed').length;
  const trials = data.trials.length;
  const completedTrials = data.trials.filter((t) => t.status === 'complete').length;
  const scanned = data.findings.length > 0 || trials > 0;
  return {
    eyebrow: '02 / IMPROVE',
    title: 'Your next improvement is in the field.',
    steps: progress([
      { label: 'Scan', detail: scanned ? 'Done' : 'Not yet', done: scanned },
      { label: 'Find', detail: `${openFindings} open`, done: openFindings === 0 && trials > 0 },
      { label: 'Validate', detail: plural(trials, 'trial'), done: completedTrials > 0 },
    ]),
    cta: openFindings ? `Review ${plural(openFindings, 'finding')}` : 'Scan service records',
    href: openFindings ? '/findings' : '/scans/new',
    primary: openFindings > 0,
  };
}

export function WhereThingsStand() {
  const { data } = useWorkspace();
  return (
    <section
      aria-labelledby="where-things-stand"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      <h2
        id="where-things-stand"
        className="m-0 border-b border-border bg-surface-sunken px-6 py-3.5 text-2xs font-semibold tracking-[1.6px] text-brand-600 uppercase"
      >
        Where things stand
      </h2>
      {data ? (
        <>
          <TrackRow {...createTrack(data)} />
          <TrackRow {...improveTrack(data)} />
        </>
      ) : (
        <div aria-busy className="h-60" />
      )}
    </section>
  );
}

function TrackRow({ eyebrow, title, steps, cta, href, primary }: Track) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-5 border-b border-border p-5 last:border-b-0 md:p-6">
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
        <span className="text-2xs font-semibold tracking-[1.6px] text-brand-600">{eyebrow}</span>
        <span className="font-serif text-lg leading-[1.25] text-foreground">{title}</span>
      </div>
      <ol aria-label={`${eyebrow} progress`} className="m-0 flex flex-[1.2_1_260px] p-0">
        {steps.map((step, i) => (
          <StepItem key={step.label} {...step} last={i === steps.length - 1} />
        ))}
      </ol>
      <Link
        href={href}
        className={cn(
          'inline-flex h-11 items-center justify-center rounded-lg border px-4.5 text-base font-semibold whitespace-nowrap transition-colors max-md:flex-[1_1_100%]',
          primary
            ? 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover'
            : 'border-border-strong bg-card text-primary hover:bg-accent',
        )}
      >
        {cta}
      </Link>
    </div>
  );
}

function StepItem({ label, detail, state, last }: Step & { last: boolean }) {
  return (
    <li
      aria-current={state === 'current' ? 'step' : undefined}
      className="flex min-w-0 flex-1 list-none flex-col gap-1.5"
    >
      <div className="flex items-center">
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border',
            state === 'done' && 'border-primary bg-primary text-primary-foreground',
            state === 'current' && 'border-warning-border bg-warning-surface',
            state === 'todo' && 'border-border-strong bg-card',
          )}
        >
          {state === 'done' && <Check size={12} strokeWidth={3} aria-label="Done" />}
          {state === 'current' && <span className="size-2 rounded-full bg-warning" />}
        </span>
        {!last && (
          <span
            aria-hidden
            className={cn(
              'mx-1.5 h-px flex-1',
              state === 'done' ? 'bg-brand-500' : 'bg-border-strong',
            )}
          />
        )}
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span
        className={cn('text-xs', state === 'current' ? 'text-warning' : 'text-muted-foreground')}
      >
        {detail}
      </span>
    </li>
  );
}

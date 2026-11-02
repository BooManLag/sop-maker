'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Eyebrow } from '@/components/common/eyebrow';
import { useWorkspace } from '@/lib/client/queries';
import { cn } from '@/lib/utils';
import { createTrack, improveTrack, type Step, type Track } from './tracks';

export function WhereThingsStand() {
  const { data } = useWorkspace();
  return (
    <section
      aria-labelledby="where-things-stand"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      <h2
        id="where-things-stand"
        className="m-0 border-b border-border bg-surface-sunken px-6 py-3.5"
      >
        <Eyebrow>Where things stand</Eyebrow>
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

const actionStyles: Record<Track['action']['emphasis'], string> = {
  primary: 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'border-border-strong bg-card text-primary hover:bg-accent',
};

function TrackRow({ eyebrow, title, steps, action }: Track) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-5 border-b border-border p-5 last:border-b-0 md:p-6">
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <span className="font-serif text-lg leading-[1.25] text-foreground">{title}</span>
      </div>
      <ol aria-label={`${eyebrow} progress`} className="m-0 flex flex-[1.2_1_260px] p-0">
        {steps.map((step) => (
          <StepItem key={step.label} {...step} />
        ))}
      </ol>
      <Link
        href={action.href}
        className={cn(
          'inline-flex h-11 items-center justify-center rounded-lg border px-4.5 text-base font-semibold whitespace-nowrap transition-colors max-md:flex-[1_1_100%]',
          actionStyles[action.emphasis],
        )}
      >
        {action.label}
      </Link>
    </div>
  );
}

const markerStyles: Record<Step['state'], string> = {
  done: 'border-primary bg-primary text-primary-foreground',
  current: 'border-warning-border bg-warning-surface',
  todo: 'border-border-strong bg-card',
};

function StepItem({ label, detail, state }: Step) {
  return (
    <li
      aria-current={state === 'current' ? 'step' : undefined}
      className="group flex min-w-0 flex-1 list-none flex-col gap-1.5"
    >
      <div className="flex items-center">
        <span
          aria-hidden
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border',
            markerStyles[state],
          )}
        >
          {state === 'done' ? <Check size={12} strokeWidth={3} /> : null}
          {state === 'current' ? <span className="size-2 rounded-full bg-warning" /> : null}
        </span>
        <span
          aria-hidden
          className={cn(
            'mx-1.5 h-px flex-1 group-last:hidden',
            state === 'done' ? 'bg-brand-500' : 'bg-border-strong',
          )}
        />
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

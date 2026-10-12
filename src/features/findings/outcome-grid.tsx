import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Outcome = {
  label: string;
  rate: number | string;
  caption: string;
  highlight?: boolean;
};

/** Side-by-side rates; the optional summary column separates itself with a rule. */
export function OutcomeGrid({
  outcomes,
  summary,
  className,
}: {
  outcomes: Outcome[];
  summary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mt-6 grid grid-cols-2 gap-6 sm:grid-cols-[1fr_1fr_1.15fr] sm:gap-3.5 lg:gap-5',
        className,
      )}
    >
      {outcomes.map((o) => (
        <div key={o.label} className="flex flex-col gap-2">
          <small className="text-tiny text-brand-400">{o.label}</small>
          <strong
            className={cn(
              'text-4xl font-normal tracking-[-1.3px] md:text-3xl lg:text-5xl',
              o.highlight && 'text-brand-600',
            )}
          >
            {o.rate}
            <span className="ml-0.5 text-lg">%</span>
          </strong>
          <span className="text-tiny text-brand-400">{o.caption}</span>
        </div>
      ))}
      {summary && (
        <div className="col-span-full flex flex-col gap-2 border-t border-border pt-5 text-brand-500 sm:col-span-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
          {summary}
        </div>
      )}
    </div>
  );
}

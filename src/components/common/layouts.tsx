import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Main content with a side rail (285px, 245px below 1150px); stacks below 900px. */
export function WithSideRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_245px] md:gap-4 lg:grid-cols-[minmax(0,1fr)_285px] lg:gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6.5 flex flex-wrap items-center justify-end gap-2.5 sm:flex-nowrap">
      {children}
    </div>
  );
}

export function TwoFields({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/** Side-rail panel typography: headings, body copy, full-width actions, fine print. */
export const sideRailClass =
  'text-sm [&_h3]:mt-4.5 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:tracking-[-0.4px] [&_p]:text-sm [&_small]:mt-3.5 [&_small]:block [&_small]:text-tiny [&_small]:text-brand-400 [&_[data-slot=button]]:mt-2.5 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:gap-2.5 [&_[data-slot=button]]:whitespace-normal';

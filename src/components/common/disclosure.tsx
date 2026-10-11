import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const hideMarker = 'list-none [&::-webkit-details-marker]:hidden';

/** Native <details>: accessible, keyboard-friendly and needs no JavaScript. */
export function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="group mt-6 border-t border-border pt-4.5 text-xs [&_p]:mt-4 [&_p]:text-xs">
      <summary
        className={`flex cursor-pointer items-center justify-between text-brand-500 ${hideMarker}`}
      >
        {summary}
        <ChevronDown size={14} aria-hidden className="transition-transform group-open:rotate-180" />
      </summary>
      {children}
    </details>
  );
}

export function QuietDisclosure({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group mt-6 text-xs text-brand-400 [&_p]:max-w-[650px] [&_p]:p-5">
      <summary className={`flex cursor-pointer items-center gap-2 ${hideMarker}`}>
        <ChevronRight size={16} aria-hidden className="transition-transform group-open:rotate-90" />
        {summary}
      </summary>
      {children}
    </details>
  );
}

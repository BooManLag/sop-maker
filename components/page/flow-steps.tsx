import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const createFlow = ['Capture', 'Clarify', 'Review', 'Publish'];
export const improveFlow = ['Scan', 'Findings', 'Validate'];

export function FlowSteps({ items, current }: { items: string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="mt-1 mb-8 flex items-center gap-2.5 sm:gap-4">
      {items.map((item, i) => (
        <li
          key={item}
          aria-current={i === current ? 'step' : undefined}
          className={cn(
            'flex items-center gap-1.5 text-tiny text-subtle-foreground sm:gap-2 sm:text-xs',
            i <= current && 'text-brand-600',
          )}
        >
          <span
            className={cn(
              'grid size-5 place-items-center rounded-full border border-border text-2xs',
              i <= current && 'border-border-strong bg-brand-100',
            )}
          >
            {i < current ? <Check size={12} aria-label="Done" /> : i + 1}
          </span>
          {item}
          {i < items.length - 1 && <ChevronRight size={13} aria-hidden className="max-sm:w-2" />}
        </li>
      ))}
    </ol>
  );
}

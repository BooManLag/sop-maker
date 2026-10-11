import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 text-2xs leading-normal font-semibold tracking-[1.6px] text-brand-400 uppercase max-sm:tracking-[1.3px]',
        className,
      )}
    >
      {children}
    </span>
  );
}

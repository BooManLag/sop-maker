import * as React from 'react';
import { cn } from '@/lib/utils';

export const fieldControlClass =
  'w-full min-w-0 rounded-xs border border-input bg-input-background p-3 text-sm leading-[1.55] text-foreground-soft outline-none placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 read-only:text-muted-foreground aria-invalid:border-destructive';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input type={type} data-slot="input" className={cn(fieldControlClass, className)} {...props} />
  );
}

export { Input };

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-xs px-2 py-1.5 text-2xs leading-none font-semibold tracking-[0.5px] whitespace-nowrap uppercase',
  {
    variants: {
      tone: {
        green: 'bg-muted text-brand-500',
        amber: 'bg-warning-surface text-warning',
        gray: 'bg-background text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'green' },
  },
);

function Badge({
  className,
  tone,
  children,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props}>
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {children}
    </span>
  );
}

export { Badge, badgeVariants };

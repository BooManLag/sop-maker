import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center rounded-full border px-2.5 text-xs leading-none font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        green: 'border-border-strong bg-brand-100 text-brand-700',
        amber: 'border-warning-border bg-warning-surface text-warning',
        gray: 'border-border bg-card text-muted-foreground',
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
      {children}
    </span>
  );
}

export { Badge, badgeVariants };

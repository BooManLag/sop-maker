import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-sm border text-xs leading-[1.7]', {
  variants: {
    variant: {
      info: 'my-4 border-border bg-muted p-4 text-brand-500',
      warning: 'my-4 border-warning-border bg-warning-surface p-4 text-warning',
      destructive:
        'mb-6 flex justify-between gap-2.5 rounded-md border-destructive-border bg-destructive-surface p-4 text-sm leading-[1.6] text-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={variant === 'destructive' ? 'alert' : undefined}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert, alertVariants };

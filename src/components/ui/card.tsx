import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('rounded-lg border', {
  variants: {
    tone: {
      panel: 'border-border bg-card p-5 lg:p-6.5',
      sample: 'border-border-strong bg-muted p-7',
    },
  },
  defaultVariants: { tone: 'panel' },
});

function Card({
  className,
  tone,
  ...props
}: React.ComponentProps<'section'> & VariantProps<typeof cardVariants>) {
  return <section data-slot="card" className={cn(cardVariants({ tone }), className)} {...props} />;
}

export { Card, cardVariants };

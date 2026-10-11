import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'gap-4 rounded-sm border border-primary bg-primary px-4 py-3 text-xs leading-[1.3] font-medium text-primary-foreground hover:bg-primary-hover',
        secondary:
          'gap-4 rounded-sm border border-border-strong bg-secondary px-4 py-3 text-xs leading-[1.3] font-medium text-secondary-foreground hover:bg-secondary-hover',
        link: 'gap-2 p-0 text-xs text-brand-500 hover:text-foreground',
        ghost: 'p-0 text-subtle-foreground hover:text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Button({
  className,
  variant,
  asChild = false,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };

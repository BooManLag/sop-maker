'use client';

import { CircleCheck } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      duration={4500}
      icons={{ success: <CircleCheck className="size-4.5" /> }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex max-w-[90vw] items-center gap-2.5 rounded-md bg-brand-800 px-6 py-4 text-sm text-primary-foreground shadow-pop max-sm:text-xs',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };

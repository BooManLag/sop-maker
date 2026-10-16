import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The brand mark: a tilted stack of layers. */
export function LogoMark({ size, className }: { size: number; className?: string }) {
  return <Layers size={size} aria-hidden className={cn('-rotate-7 text-brand-600', className)} />;
}

/** "good exception." with its light full stop; `stacked` breaks it over two lines. */
export function Wordmark({ stacked = false }: { stacked?: boolean }) {
  return (
    <span>
      good
      {stacked ? <br /> : ' '}
      exception<span className="text-brand-300">.</span>
    </span>
  );
}

import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

/** The product's ethical footnote that closes most pages. */
export function Principle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mt-7 flex items-center gap-2 py-3.5 text-2xs leading-[1.6] text-subtle-foreground sm:text-tiny [&_strong]:font-normal [&_strong]:text-brand-400">
      <ShieldCheck size={17} className="shrink-0 text-brand-400" aria-hidden />
      <span>{children}</span>
      {aside && <span className="ml-auto text-2xs max-md:hidden">{aside}</span>}
    </div>
  );
}

import { Layers } from 'lucide-react';
import { Eyebrow } from '@/components/common/eyebrow';

export function Hero() {
  return (
    <div className="mb-8 flex flex-col items-center gap-3.5 pt-2 text-center">
      <Layers size={40} className="-rotate-7 text-brand-600" aria-hidden />
      <Eyebrow>FROM KNOW-HOW TO A BETTER WAY</Eyebrow>
      <h1 className="m-0 max-w-[720px] font-serif text-3xl leading-[1.05] font-normal tracking-[-1px] text-balance md:text-7xl">
        Good work deserves to become the standard.
      </h1>
      <p className="m-0 max-w-[480px] text-base leading-[1.55] text-pretty text-foreground-soft md:text-md">
        Capture what your experienced people know. Find what works in the field. Make it your next
        standard.
      </p>
    </div>
  );
}

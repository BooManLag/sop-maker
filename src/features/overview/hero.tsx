import { Eyebrow } from '@/components/common/eyebrow';
import { LogoMark } from '@/components/layout/logo';

export function Hero() {
  return (
    <div className="mb-8 flex flex-col items-center gap-3.5 pt-2 text-center">
      <LogoMark size={52} />
      <Eyebrow>FROM KNOW-HOW TO A BETTER WAY</Eyebrow>
      <h1 className="m-0 max-w-[720px] text-3xl leading-[1.05] tracking-[-1px] text-balance md:text-7xl">
        Good work deserves to become the standard.
      </h1>
      <p className="m-0 max-w-[480px] text-base leading-[1.55] text-pretty text-foreground-soft md:text-md">
        Capture what your experienced people know. Find what works in the field. Make it your next
        standard.
      </p>
    </div>
  );
}

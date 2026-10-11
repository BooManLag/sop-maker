import { Check } from 'lucide-react';
import { Eyebrow } from '@/components/common/eyebrow';

export function Hero() {
  return (
    <div className="mb-7.5">
      <Eyebrow>
        <span aria-hidden className="h-px w-4.5 bg-brand-400" />
        FROM KNOW-HOW TO A BETTER WAY
      </Eyebrow>
      <div className="flex items-center justify-between pt-4 md:pt-5">
        <div>
          <h1 className="mb-4 text-3xl leading-[1.14] tracking-[-1.6px] lg:text-5xl lg:tracking-[-1.8px] xl:text-6xl">
            Good work deserves
            <br />
            to become the standard.
          </h1>
          <p className="m-0 text-sm leading-[1.85] text-muted-foreground sm:text-lead">
            Capture what your experienced people know.
            <br />
            Find what works in the field. Make it your next standard.
          </p>
        </div>
        <OrbitMark />
      </div>
    </div>
  );
}

function OrbitMark() {
  const orbit = 'absolute top-5 left-6.5 h-24 w-[142px] rounded-full border border-border-strong';
  return (
    <div
      aria-hidden
      className="relative hidden h-[158px] w-[212px] shrink-0 md:block md:scale-85 lg:mr-15 lg:scale-100"
    >
      <div className={`${orbit} -rotate-25`} />
      <div className={`${orbit} rotate-35 border-dashed`} />
      <div className={`${orbit} w-[135px] rotate-90`} />
      <span className="absolute top-11 left-[75px] grid size-12 place-items-center rounded-full border border-border-strong bg-brand-100 text-brand-500">
        <Check size={28} />
      </span>
      <span className="absolute bottom-1 left-[65px] font-serif text-sm text-brand-400 italic">
        a better way
      </span>
    </div>
  );
}

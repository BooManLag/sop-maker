'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/common/disclosure';
import { EmptyState } from '@/components/common/empty-state';
import { Eyebrow } from '@/components/common/eyebrow';
import { QueryState } from '@/components/common/query-state';
import { useScan } from '@/lib/client/queries';
import { cn } from '@/lib/utils';

const funnelStages = [
  'jobs reviewed',
  'recurring differences found',
  'had enough comparable examples',
  'were associated with fewer callbacks',
  'survived validation on later jobs',
];
const revealIntervalMs = 450;
const numberWords = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

function survivorsHeadline(count: number) {
  const amount = numberWords[count] ?? count.toLocaleString();
  return `${amount} ${count === 1 ? 'practice' : 'practices'} worth investigating.`;
}

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(reducedMotionQuery);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

/** Reveals one funnel stage at a time so the narrowing is legible; instant with reduced motion. */
function useStagedReveal(total: number) {
  const reducedMotion = usePrefersReducedMotion();
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => setTicks((n) => Math.min(n + 1, total)), revealIntervalMs);
    return () => clearInterval(timer);
  }, [reducedMotion, total]);
  return reducedMotion ? total : ticks;
}

export function ScanResults({ scanId }: { scanId: string }) {
  return (
    <QueryState query={useScan(scanId)}>
      {(scan) =>
        scan.funnel ? (
          <Funnel counts={scan.funnel} />
        ) : (
          <EmptyState
            title="This scan has not run yet."
            description="Check the data and run the scan to see what survived."
            action={
              <Button asChild>
                <Link href={`/scans/${scanId}`}>Back to data check</Link>
              </Button>
            }
          />
        )
      }
    </QueryState>
  );
}

function Funnel({ counts }: { counts: number[] }) {
  const revealed = useStagedReveal(counts.length);
  const done = revealed >= counts.length;
  const survivors = counts.at(-1) ?? 0;
  return (
    <div className="mx-auto my-11 max-w-[650px]">
      <Eyebrow>SAMPLE SCAN</Eyebrow>
      <h1
        className="mt-5.5 text-2xl leading-[1.13] tracking-[-1.6px] sm:text-3xl"
        aria-live="polite"
      >
        {done
          ? survivorsHeadline(survivors)
          : 'Looking for practices that consistently perform better.'}
      </h1>
      <p className="text-lead">Every pattern has to earn its place.</p>
      <ol className="my-9">
        {counts.map((count, i) => (
          <li
            key={funnelStages[i]}
            className={cn(
              'flex items-center gap-3 border-b border-border px-2 py-4.5 text-tiny text-subtle-foreground/60 sm:gap-3.5 sm:p-5 sm:text-sm',
              revealed > i && 'text-brand-500',
            )}
          >
            {revealed > i ? (
              <CheckCircle2 size={19} aria-hidden />
            ) : (
              <Circle size={19} aria-hidden />
            )}
            <strong className="min-w-20 text-lg font-normal sm:min-w-[91px] sm:text-xl">
              {count.toLocaleString()}
            </strong>
            <span>{funnelStages[i]}</span>
          </li>
        ))}
      </ol>
      <Disclosure summary="View methodology">
        <p>
          This is an illustrative funnel, not an analysis of uploaded records. Live analysis will
          compare practices within technician histories and equipment groups, then test on later
          jobs. Historical association does not establish causation.
        </p>
      </Disclosure>
      <Button asChild className={cn('mt-6', !done && 'pointer-events-none opacity-45')}>
        <Link href="/findings" aria-disabled={!done} tabIndex={done ? undefined : -1}>
          Review findings
          <ArrowRight size={16} aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

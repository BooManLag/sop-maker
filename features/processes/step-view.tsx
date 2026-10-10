import type { ReactNode } from 'react';
import type { ProcessStep } from '@/lib/domain';

export const stepNumber = (sequence: number) => String(sequence).padStart(2, '0');

/** One numbered step row; used read-only on the living SOP and with fields on review. */
export function StepRow({ number, children }: { number: number; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-border py-6 first:pt-0 last:border-b-0 last:pb-0 sm:gap-5">
      <span className="min-w-5 text-xs text-brand-300">{stepNumber(number)}</span>
      {children}
    </div>
  );
}

export function StepView({ step }: { step: ProcessStep }) {
  return (
    <StepRow number={step.sequence}>
      <div>
        <h3 className="mb-2 text-base leading-[1.45]">{step.action}</h3>
        {step.rationale && <p className="mb-2 text-sm">{step.rationale}</p>}
        {step.condition && (
          <small className="text-tiny text-brand-400">USE WHEN · {step.condition}</small>
        )}
        {step.warning && (
          <div className="mt-2.5 rounded-xs border border-warning-border bg-warning-surface p-3 text-xs text-warning">
            {step.warning}
          </div>
        )}
      </div>
    </StepRow>
  );
}

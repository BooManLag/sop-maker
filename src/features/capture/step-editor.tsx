'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUp, GripVertical, Plus, X } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/common/error-banner';
import { FormActions } from '@/components/common/layouts';
import { api } from '@/lib/client/browser';
import { useWorkspaceMutation } from '@/lib/client/queries';
import type { ProcessStep } from '@/lib/domain/types';
import { addStep, mergeWithNext, moveStep, removeStep } from '@/lib/domain/steps';
import { draftPath } from './paths';

const toolClass =
  'rounded-[3px] bg-muted p-2 text-tiny text-brand-500 disabled:opacity-45 sm:p-1.5';

export function StepEditor({
  processId,
  captureId,
  initialSteps,
  sample,
}: {
  processId: string;
  captureId: string;
  initialSteps: ProcessStep[];
  sample: boolean;
}) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const save = useWorkspaceMutation(() => api.saveDraft(processId, steps));
  const canContinue = steps.length > 0 && steps.every((s) => s.action.trim());

  const rename = (index: number, action: string) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, action } : s)));

  return (
    <>
      <ErrorBanner error={save.error} onDismiss={save.reset} />
      <Alert>
        {sample ? 'Sample extraction' : 'Rule-based text extraction'} · Review carefully. Gemini is
        not connected.
      </Alert>
      <Card>
        <ol>
          {steps.map((step, i) => (
            <li
              key={step.id}
              className="flex flex-wrap items-center gap-1.5 border-b border-border py-3.5 sm:flex-nowrap sm:gap-2.5"
            >
              <GripVertical size={16} aria-hidden className="text-brand-400" />
              <span className="min-w-5 text-xs text-brand-300">{i + 1}</span>
              <input
                aria-label={`Step ${i + 1} action`}
                value={step.action}
                onChange={(e) => rename(i, e.target.value)}
                className="min-w-[180px] flex-1 rounded-xs border border-input p-2.5 text-sm text-foreground-soft focus-visible:border-ring focus-visible:outline-none sm:min-w-[50px]"
              />
              <button
                type="button"
                className={toolClass}
                disabled={i === 0}
                onClick={() => setSteps((prev) => moveStep(prev, i, 'up'))}
                aria-label={`Move step ${i + 1} up`}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                className={toolClass}
                disabled={i === steps.length - 1}
                onClick={() => setSteps((prev) => moveStep(prev, i, 'down'))}
                aria-label={`Move step ${i + 1} down`}
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                className={toolClass}
                disabled={i === steps.length - 1}
                onClick={() => setSteps((prev) => mergeWithNext(prev, i))}
                aria-label={`Merge step ${i + 1} with next`}
              >
                Merge
              </button>
              <button
                type="button"
                className={toolClass}
                onClick={() => setSteps((prev) => removeStep(prev, step.id))}
                aria-label={`Remove step ${i + 1}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ol>
        <Button
          variant="link"
          className="mt-5"
          onClick={() => setSteps((prev) => addStep(prev, crypto.randomUUID()))}
        >
          <Plus size={16} aria-hidden />
          Add a step
        </Button>
      </Card>
      <FormActions>
        <Button
          disabled={!canContinue || save.isPending}
          onClick={() =>
            save.mutate(undefined, {
              onSuccess: () => router.push(draftPath(processId, captureId, 'clarify', sample)),
            })
          }
        >
          Clarify the know-how
          <ArrowRight size={16} aria-hidden />
        </Button>
      </FormActions>
    </>
  );
}

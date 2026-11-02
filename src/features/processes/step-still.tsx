'use client';

import { useProcessMedia } from '@/lib/client/queries';
import type { ProcessStep } from '@/lib/domain/types';

/** Signed links for the steps that have a still; none are requested when no step has one. */
export function useStepStills(processId: string, steps: ProcessStep[]) {
  const media = useProcessMedia(
    processId,
    steps.some((step) => step.frameObjectPath),
  );
  return media.data?.frames ?? {};
}

/** A step's still from the walkthrough, read-only. */
export function StepStill({ url, label }: { url?: string; label: string }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed storage links change every few minutes.
    <img
      src={url}
      alt={`Still for ${label}`}
      className="mt-3 max-h-72 w-full max-w-md rounded-xs border border-border object-contain"
    />
  );
}

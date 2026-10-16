'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUp, GripVertical, Plus, X } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/common/error-banner';
import { FormActions } from '@/components/common/layouts';
import { api } from '@/lib/client/browser';
import { useProcess, useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
import type { ProcessStep, StepImageLinks } from '@/lib/domain/types';
import { addStep, mergeWithNext, moveStep, removeStep } from '@/lib/domain/steps';
import { draftPath } from './paths';
import { StepImagePicker } from './step-image-picker';
import { useAutoCapture, useFramePicker } from './use-frame-picker';

const toolClass =
  'rounded-[3px] bg-muted p-2 text-tiny text-brand-500 disabled:opacity-45 sm:p-1.5';

export function StepEditor({
  processId,
  captureId,
  initialSteps,
}: {
  processId: string;
  captureId: string;
  initialSteps: ProcessStep[];
}) {
  const router = useRouter();
  const demo = useWorkspace().data?.demo;
  const [steps, setSteps] = useState(initialSteps);
  const save = useWorkspaceMutation(() => api.saveDraft(processId, steps));
  const canContinue = steps.length > 0 && steps.every((s) => s.action.trim());

  const rename = (index: number, action: string) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, action } : s)));
  const setImage = useCallback(
    (stepId: string, image: Pick<ProcessStep, 'frameAtMs' | 'frameObjectPath'>) =>
      setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...image } : s))),
    [],
  );
  const video = useRef<HTMLVideoElement>(null);
  const picker = useFramePicker({ processId, captureId, video, onStored: setImage });
  const [videoReady, setVideoReady] = useState(false);
  useAutoCapture(steps, {
    ready: videoReady,
    busy: picker.busy !== undefined,
    // A step added here must reach the server before its still can be stored.
    capture: async (stepId, atMs) => {
      await ensureSaved(stepId);
      await picker.capture(stepId, atMs);
    },
  });
  const serverSteps = useProcess(processId).data?.versions[0].steps ?? [];
  const imageUrls = imageUrlsByPath(serverSteps, picker.links);
  /** A step added here exists only in this screen until the draft is saved. */
  async function ensureSaved(stepId: string) {
    if (!serverSteps.some((s) => s.id === stepId)) await api.saveDraft(processId, steps);
  }

  return (
    <>
      <ErrorBanner error={save.error} onDismiss={save.reset} />
      <Alert>
        {demo
          ? 'Rule-based text extraction · Review carefully. Gemini is not connected.'
          : 'Model-generated candidate steps · Review carefully before continuing.'}
      </Alert>
      <ErrorBanner error={picker.error} onDismiss={picker.dismissError} />
      {picker.source && (
        <video
          ref={video}
          src={picker.source.url}
          crossOrigin={picker.source.crossOrigin}
          preload="auto"
          muted
          playsInline
          className="hidden"
          onLoadedData={() => setVideoReady(true)}
        />
      )}
      <Card>
        <ol>
          {steps.map((step, i) => (
            <li key={step.id} className="grid gap-2 border-b border-border py-3.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2.5">
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
              </div>
              <StepImagePicker
                key={`${step.id}:${step.frameAtMs ?? ''}`}
                step={step}
                label={`Step ${i + 1}`}
                imageUrl={step.frameObjectPath ? imageUrls[step.frameObjectPath] : undefined}
                canCapture={videoReady}
                busy={picker.busy === step.id}
                onCapture={async (atMs) => {
                  await ensureSaved(step.id);
                  await picker.capture(step.id, atMs);
                }}
                onUpload={async (atMs, file) => {
                  await ensureSaved(step.id);
                  await picker.upload(step.id, atMs, file);
                }}
                onRemove={() => setImage(step.id, { frameObjectPath: undefined })}
                onWaive={(imageWaived) =>
                  setSteps((prev) =>
                    prev.map((s) => (s.id === step.id ? { ...s, imageWaived } : s)),
                  )
                }
              />
            </li>
          ))}
        </ol>
        <Button
          variant="link"
          className="mt-5"
          onClick={() =>
            setSteps((prev) => addStep(prev, crypto.randomUUID(), recordingMs(video.current)))
          }
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
              onSuccess: () => router.push(draftPath(processId, captureId, 'clarify')),
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

/** The loaded recording's length, so a new step's still lands inside it; none without a video. */
function recordingMs(player: HTMLVideoElement | null) {
  const seconds = player?.duration;
  return seconds && Number.isFinite(seconds) ? Math.floor(seconds * 1000) : undefined;
}

/** Signed links are keyed by the server's step ids; a merge can move an image to another step. */
function imageUrlsByPath(stored: ProcessStep[], links: StepImageLinks) {
  return Object.fromEntries(
    stored.flatMap((s) =>
      s.frameObjectPath && links[s.id] ? [[s.frameObjectPath, links[s.id]]] : [],
    ),
  );
}

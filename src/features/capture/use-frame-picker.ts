'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/browser';
import { queryKeys, useProcessMedia } from '@/lib/client/queries';
import type { MediaLinks } from '@/lib/client/api';
import { putWithProgress } from '@/lib/client/upload';
import { isVideo, maxFrameBytes, type ProcessStep } from '@/lib/domain/types';
import { grabFrame, imageFromFile } from './frame-image';
import { localRecording } from './recording';

type StepImage = Pick<ProcessStep, 'frameAtMs' | 'frameObjectPath'>;

/**
 * Captures step images from the draft's video and stores them. Prefers the file still held by
 * this tab, else streams the stored recording, so picking works after a reload too.
 */
export function useFramePicker({
  processId,
  captureId,
  video,
  onStored,
}: {
  processId: string;
  captureId: string;
  /** The hidden player stills are captured from. */
  video: RefObject<HTMLVideoElement | null>;
  /** Called with a step's new image once storage holds it. */
  onStored: (stepId: string, image: StepImage) => void;
}) {
  const queryClient = useQueryClient();
  const media = useProcessMedia(processId);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<Error | null>(null);
  // Links are re-signed on every refresh; keep the first so the loaded video is never reset.
  const [source, setSource] = useState<VideoSource>();
  const available = videoSource(captureId, media.data?.video);
  if (!source && available) setSource(available);

  const store = useCallback(
    async (stepId: string, atMs: number, image: Blob) => {
      const target = await api.requestFrame(processId, {
        captureId,
        stepId,
        atMs,
        bytes: image.size,
      });
      await putWithProgress(target, image, () => undefined);
      const stored = (await api.process(processId)).versions[0].steps.find((s) => s.id === stepId);
      onStored(stepId, { frameAtMs: stored?.frameAtMs, frameObjectPath: stored?.frameObjectPath });
      await queryClient.invalidateQueries({ queryKey: queryKeys.media(processId) });
    },
    [captureId, onStored, processId, queryClient],
  );

  const run = useCallback(async (stepId: string, work: () => Promise<void>) => {
    setBusy(stepId);
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError(failure instanceof Error ? failure : new Error('The image could not be saved.'));
    } finally {
      setBusy(undefined);
    }
  }, []);

  const capture = useCallback(
    (stepId: string, atMs: number) =>
      run(stepId, async () => {
        if (!video.current) throw new Error('The video is not available.');
        await store(stepId, atMs, await grabFrame(video.current, atMs, maxFrameBytes));
      }),
    [run, store, video],
  );
  const upload = useCallback(
    (stepId: string, atMs: number, file: File) =>
      run(stepId, async () => store(stepId, atMs, await imageFromFile(file, maxFrameBytes))),
    [run, store],
  );

  const dismissError = useCallback(() => setError(null), []);
  const links = media.data?.frames ?? {};
  return { source, busy, error, dismissError, capture, upload, links };
}

/**
 * Captures an image at each proposed time for steps that have none, one at a time. Each step is
 * tried once; `retry` clears that so its still is grabbed again once the video is ready.
 */
export function useAutoCapture(
  steps: ProcessStep[],
  {
    ready,
    busy,
    capture,
  }: { ready: boolean; busy: boolean; capture: (stepId: string, atMs: number) => Promise<void> },
) {
  const attempted = useRef(new Set<string>());
  const [retries, setRetries] = useState(0);
  useEffect(() => {
    if (!ready || busy) return;
    const next = steps.find(
      (s) =>
        s.frameAtMs !== undefined &&
        !s.frameObjectPath &&
        !s.imageWaived &&
        !attempted.current.has(s.id),
    );
    if (next?.frameAtMs === undefined) return;
    attempted.current.add(next.id);
    void capture(next.id, next.frameAtMs);
    // `retries` only re-runs this effect after a step's attempt is cleared.
  }, [ready, busy, capture, steps, retries]);
  return useCallback((stepId: string) => {
    attempted.current.delete(stepId);
    setRetries((n) => n + 1);
  }, []);
}

type VideoSource = { url: string; crossOrigin?: 'anonymous' };
function videoSource(captureId: string, stored?: MediaLinks['video']): VideoSource | undefined {
  const local = localRecording(captureId);
  if (local?.video) return { url: local.url };
  if (stored?.captureId === captureId && isVideo(stored.contentType))
    return { url: stored.url, crossOrigin: 'anonymous' };
  return undefined;
}

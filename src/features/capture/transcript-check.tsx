'use client';

import { useEffect, useRef, useState, type Ref } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorBanner } from '@/components/common/error-banner';
import { FormActions } from '@/components/common/layouts';
import { QueryState } from '@/components/common/query-state';
import { api } from '@/lib/client/browser';
import type { DraftCapture, TranscriptSegment } from '@/lib/client/api';
import { useCapture, useWorkspace, useWorkspaceMutation } from '@/lib/client/queries';
import { WithDraft } from './draft-steps';
import { draftPath } from './paths';
import { formatClock, localRecording } from './recording';

type TranscriptProps = { processId: string; captureId: string };

export function TranscriptCheck(props: TranscriptProps) {
  const capture = useCapture(props.captureId);
  return (
    <WithDraft processId={props.processId}>
      {() => (
        <QueryState query={capture}>
          {(loaded) => <TranscriptState {...props} capture={loaded} />}
        </QueryState>
      )}
    </WithDraft>
  );
}

const startOver = (
  <Button asChild variant="secondary">
    <Link href="/processes/new">Start a new capture</Link>
  </Button>
);

function TranscriptState(props: TranscriptProps & { capture: DraftCapture }) {
  switch (props.capture.status) {
    case 'awaiting_upload':
      return <Processing durationMs={props.capture.durationMs} />;
    case 'rejected':
      return (
        <EmptyState
          title="The recording was not accepted."
          description={`${props.capture.rejection ?? 'Its contents could not be checked.'} Nothing was transcribed.`}
          action={startOver}
        />
      );
    case 'failed':
      return (
        <EmptyState
          title="The recording could not be transcribed."
          description="No draft was created from it. Try again, or paste the walkthrough instead."
          action={startOver}
        />
      );
    case 'transcribed':
      return <TranscriptForm key={props.capture.segments?.length} {...props} />;
    default:
      return (
        <EmptyState
          title="This capture has no recording."
          description="Walkthrough text goes straight to the step editor."
        />
      );
  }
}

/**
 * Shown while the recording is checked and transcribed. The server reports only that work is
 * under way, not how far along it is, so the bar sweeps rather than claiming a percentage.
 */
function Processing({ durationMs }: { durationMs?: number }) {
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Card className="grid gap-4 py-10 text-center">
      <div role="status" aria-live="polite" className="grid gap-1.5">
        <strong className="text-base font-medium">Checking and transcribing the recording…</strong>
        <span className="text-xs text-subtle-foreground">
          {formatClock(now - started)} elapsed
          {durationMs ? ` · recording is ${formatClock(durationMs)} long` : ''}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Transcription in progress"
        aria-valuetext="In progress"
        className="relative mx-auto h-1.5 w-full max-w-md overflow-hidden rounded-full bg-border"
      >
        <div className="absolute inset-y-0 left-0 w-2/5 animate-indeterminate rounded-full bg-brand-600 motion-reduce:w-full motion-reduce:animate-pulse" />
      </div>
      <p className="mx-auto max-w-md text-xs text-subtle-foreground">
        Longer recordings take longer. This page updates by itself when the transcript is ready.
      </p>
    </Card>
  );
}

function TranscriptForm({
  processId,
  captureId,
  capture,
}: TranscriptProps & { capture: DraftCapture }) {
  const router = useRouter();
  const demo = useWorkspace().data?.demo;
  const [segments, setSegments] = useState<TranscriptSegment[]>(capture.segments ?? []);
  const player = useRef<HTMLMediaElement>(null);
  const playback = localRecording(captureId);
  const save = useWorkspaceMutation((next: TranscriptSegment[]) =>
    api.saveTranscript(captureId, next),
  );
  const blank = segments.some((segment) => !segment.text.trim());

  function edit(index: number, text: string) {
    setSegments((current) => current.map((s, i) => (i === index ? { ...s, text } : s)));
  }
  function seek(ms: number) {
    if (!player.current) return;
    player.current.currentTime = ms / 1000;
    void player.current.play();
  }

  return (
    <>
      <ErrorBanner error={save.error} onDismiss={save.reset} />
      {demo && (
        <Alert variant="warning">
          Demo transcript: this is sample narration spread across your recording&apos;s length, not
          what was said. Gemini transcription is not connected.
        </Alert>
      )}
      <Card className="grid gap-5">
        {playback?.video && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- the editable transcript below is the caption.
          <video
            ref={player as Ref<HTMLVideoElement>}
            src={playback.url}
            controls
            className="max-h-[50vh] w-full rounded-md bg-black"
          />
        )}
        {playback && !playback.video && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- the editable transcript below is the caption.
          <audio
            ref={player as Ref<HTMLAudioElement>}
            src={playback.url}
            controls
            className="w-full"
          />
        )}
        <ol className="grid gap-4">
          {segments.map((segment, i) => (
            <li key={segment.startMs} className="grid gap-2 sm:grid-cols-[6.5rem_1fr] sm:gap-4">
              <button
                type="button"
                disabled={!playback}
                onClick={() => seek(segment.startMs)}
                className="justify-self-start pt-2 text-left font-mono text-tiny text-brand-400 enabled:hover:text-foreground enabled:hover:underline"
                aria-label={`Play from ${formatClock(segment.startMs)}`}
              >
                {formatClock(segment.startMs)}–{formatClock(segment.endMs)}
              </button>
              <Textarea
                rows={2}
                aria-label={`Passage ${i + 1}, from ${formatClock(segment.startMs)}`}
                value={segment.text}
                onChange={(e) => edit(i, e.target.value)}
              />
            </li>
          ))}
        </ol>
        <FormActions>
          <Button
            disabled={blank || save.isPending}
            onClick={() =>
              save.mutate(segments, {
                onSuccess: () => router.push(draftPath(processId, captureId, 'steps')),
              })
            }
          >
            {save.isPending ? 'Saving…' : 'Save and review steps'}
            <ArrowRight size={16} aria-hidden />
          </Button>
        </FormActions>
        {blank && (
          <p className="text-xs text-destructive">Every passage needs text before saving.</p>
        )}
      </Card>
    </>
  );
}

'use client';

import { Mic, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadArea } from '@/components/common/upload-area';
import {
  formatClock,
  maxRecordingBytes,
  maxRecordingSeconds,
  type Recording,
  type useRecorder,
} from './recording';

const panelClass =
  'flex items-center justify-between gap-3 rounded-md border border-border bg-surface-sunken px-4.5 py-4 text-sm';

/** Pick an audio file or record one; shows the chosen recording or the live recorder instead. */
export function RecordingInput({
  recording,
  recorder,
  onFile,
  onRemove,
  onTooLarge,
}: {
  recording?: Recording;
  recorder: ReturnType<typeof useRecorder>;
  onFile: (file: File) => void;
  onRemove: () => void;
  onTooLarge: () => void;
}) {
  if (recording)
    return (
      <div className={panelClass}>
        <span className="flex min-w-0 items-center gap-2.5">
          <Mic size={18} aria-hidden className="shrink-0 text-brand-400" />
          <span className="truncate">{recording.name}</span>
          <span className="shrink-0 text-tiny text-brand-400">
            {formatClock(recording.seconds * 1000)}
          </span>
        </span>
        <Button type="button" variant="secondary" onClick={onRemove} aria-label="Remove recording">
          <X size={15} aria-hidden />
        </Button>
      </div>
    );
  if (recorder.state.phase === 'recording')
    return (
      <div className={panelClass}>
        <span role="status" className="flex items-center gap-2.5">
          <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-destructive" />
          Recording {formatClock(recorder.state.elapsed * 1000)} of{' '}
          {formatClock(maxRecordingSeconds * 1000)}
        </span>
        <Button type="button" variant="secondary" onClick={recorder.stop}>
          <Square size={14} aria-hidden />
          Stop
        </Button>
      </div>
    );
  return (
    <div className="grid gap-3">
      <UploadArea
        title="Upload an audio walkthrough"
        hint="WebM or M4A audio · up to 10 MB and 10 minutes"
        accept="audio/webm,audio/mp4,audio/x-m4a,.webm,.m4a"
        limit={{ bytes: maxRecordingBytes, onExceeded: onTooLarge }}
        onFile={onFile}
      />
      <Button type="button" variant="secondary" onClick={() => void recorder.start()}>
        <Mic size={15} aria-hidden />
        Or record a walkthrough
      </Button>
    </div>
  );
}

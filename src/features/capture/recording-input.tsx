'use client';

import { Film, Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadArea } from '@/components/common/upload-area';
import { isVideo } from '@/lib/domain/types';
import { formatMegabytes, maxMediaBytes, recordingAccept, type Recording } from './recording';

/** Pick a video or audio file; shows the chosen recording, with upload progress once it starts. */
export function RecordingInput({
  recording,
  progress,
  onFile,
  onRemove,
  onTooLarge,
}: {
  recording?: Recording;
  /** Fraction of the upload sent, while it is in flight. */
  progress?: number;
  onFile: (file: File) => void;
  onRemove: () => void;
  onTooLarge: () => void;
}) {
  if (!recording)
    return (
      <UploadArea
        title="Upload a video or audio walkthrough"
        hint={`MP4/WebM video or WebM/M4A audio · up to ${formatMegabytes(maxMediaBytes)}`}
        accept={recordingAccept}
        limit={{ bytes: maxMediaBytes, onExceeded: onTooLarge }}
        onFile={onFile}
      />
    );
  const Icon = isVideo(recording.contentType) ? Film : Mic;
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface-sunken px-4.5 py-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon size={18} aria-hidden className="shrink-0 text-brand-400" />
          <span className="truncate">{recording.file.name}</span>
          <span className="shrink-0 text-tiny text-brand-400">
            {formatMegabytes(recording.file.size)}
          </span>
        </span>
        {progress === undefined && (
          <Button
            type="button"
            variant="secondary"
            onClick={onRemove}
            aria-label="Remove recording"
          >
            <X size={15} aria-hidden />
          </Button>
        )}
      </div>
      {progress !== undefined && <UploadProgress fraction={progress} />}
    </div>
  );
}

function UploadProgress({ fraction }: { fraction: number }) {
  const percent = Math.round(fraction * 100);
  return (
    <div
      role="progressbar"
      aria-label="Upload progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 overflow-hidden rounded-full bg-border"
    >
      <div className="h-full bg-brand-600 transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

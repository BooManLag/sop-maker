'use client';

import { useState } from 'react';
import { Camera, ImageOff, Smartphone, Upload } from 'lucide-react';
import type { ProcessStep } from '@/lib/domain/types';
import { formatClock } from './recording';

const toolClass =
  'inline-flex items-center gap-1 rounded-[3px] bg-muted px-2 py-1.5 text-tiny text-brand-500 disabled:opacity-45';
const nudgeMs = 1000;

/**
 * A step's image with controls to recapture it at a nudged time, replace it, take a photo, remove
 * it, or mark the step as needing no picture.
 */
export function StepImagePicker({
  step,
  label,
  imageUrl,
  canCapture,
  busy,
  onCapture,
  onUpload,
  onRemove,
  onWaive,
}: {
  step: ProcessStep;
  label: string;
  imageUrl?: string;
  canCapture: boolean;
  busy: boolean;
  onCapture: (atMs: number) => void;
  onUpload: (atMs: number, file: File) => void;
  onRemove: () => void;
  onWaive: (waived: boolean) => void;
}) {
  const [atMs, setAtMs] = useState(step.frameAtMs ?? 0);
  const disabled = busy;
  return (
    <div className="flex w-full flex-wrap items-center gap-2 pl-8 sm:pl-12">
      <div className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-xs border border-border bg-surface-sunken text-brand-300">
        {busy ? (
          <span role="status" className="text-tiny">
            Saving…
          </span>
        ) : imageUrl && step.frameObjectPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage links change every few minutes.
          <img src={imageUrl} alt={`Still for ${label}`} className="size-full object-cover" />
        ) : step.imageWaived ? (
          <span className="px-1 text-center text-tiny">No picture needed</span>
        ) : (
          <span className="grid place-items-center gap-0.5 text-tiny">
            <ImageOff size={16} aria-hidden />
            No picture yet
          </span>
        )}
      </div>
      {canCapture && (
        <>
          <button
            type="button"
            className={toolClass}
            disabled={disabled || atMs < nudgeMs}
            onClick={() => setAtMs((ms) => Math.max(0, ms - nudgeMs))}
            aria-label={`Move ${label} image time back one second`}
          >
            −1s
          </button>
          <span className="min-w-10 text-center font-mono text-tiny text-brand-400">
            {formatClock(atMs)}
          </span>
          <button
            type="button"
            className={toolClass}
            disabled={disabled}
            onClick={() => setAtMs((ms) => ms + nudgeMs)}
            aria-label={`Move ${label} image time forward one second`}
          >
            +1s
          </button>
          <button
            type="button"
            className={toolClass}
            disabled={disabled}
            onClick={() => onCapture(atMs)}
          >
            <Camera size={13} aria-hidden />
            Capture
          </button>
        </>
      )}
      <label className={`${toolClass} ${disabled ? 'opacity-45' : 'cursor-pointer'}`}>
        <Upload size={13} aria-hidden />
        Upload image
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onUpload(atMs, file);
          }}
        />
      </label>
      {/* Opens the rear camera on phones; desktops pick a file instead. */}
      <label className={`${toolClass} ${disabled ? 'opacity-45' : 'cursor-pointer'}`}>
        <Smartphone size={13} aria-hidden />
        Take photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onUpload(atMs, file);
          }}
        />
      </label>
      {step.frameObjectPath ? (
        <button type="button" className={toolClass} disabled={busy} onClick={onRemove}>
          Remove image
        </button>
      ) : (
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-tiny text-brand-500">
          <input
            type="checkbox"
            checked={!!step.imageWaived}
            onChange={(e) => onWaive(e.target.checked)}
          />
          No picture needed
        </label>
      )}
    </div>
  );
}

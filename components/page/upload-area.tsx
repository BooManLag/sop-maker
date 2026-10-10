'use client';

import { Upload } from 'lucide-react';

export const megabytes = (count: number) => count * 1_000_000;

type SizeLimit = { bytes: number; onExceeded: () => void };

/** Dashed drop zone over a transparent file input; files over the optional `limit` never reach `onFile`. */
export function UploadArea({
  title,
  hint,
  accept,
  limit,
  onFile,
}: {
  title: string;
  hint: string;
  accept: string;
  limit?: SizeLimit;
  onFile: (file: File) => void;
}) {
  return (
    <label className="relative flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface-sunken px-4.5 py-8 text-center text-brand-500 focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-ring">
      <Upload size={25} aria-hidden />
      <strong className="text-sm font-medium">{title}</strong>
      <span className="text-tiny text-brand-400">{hint}</span>
      <input
        type="file"
        accept={accept}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (limit && file.size > limit.bytes) limit.onExceeded();
          else onFile(file);
        }}
      />
    </label>
  );
}

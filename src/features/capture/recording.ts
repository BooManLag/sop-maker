'use client';

import { isVideo, type MediaContentType } from '@/lib/domain/types';

export { maxMediaBytes } from '@/lib/domain/types';

export type Recording = { file: File; contentType: MediaContentType };

/** Upload types the server can inspect; Safari labels M4A audio `audio/x-m4a`. */
const acceptedTypes: Record<string, MediaContentType> = {
  'video/mp4': 'video/mp4',
  'video/webm': 'video/webm',
  'audio/mp4': 'audio/mp4',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/webm': 'audio/webm',
};
export const recordingAccept = [...Object.keys(acceptedTypes), '.mp4', '.webm', '.m4a'].join(',');

/** The server-side type for a chosen file; anything else is refused before upload. */
export function recordingType(file: File): MediaContentType | undefined {
  return acceptedTypes[file.type.split(';')[0].trim().toLowerCase()];
}

/** Local playback for the check screen while this tab still holds the chosen file. */
const playback = new Map<string, { url: string; video: boolean }>();
export function rememberRecording(captureId: string, recording: Recording) {
  playback.set(captureId, {
    url: URL.createObjectURL(recording.file),
    video: isVideo(recording.contentType),
  });
}
export const localRecording = (captureId: string) => playback.get(captureId);

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
export function formatMegabytes(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

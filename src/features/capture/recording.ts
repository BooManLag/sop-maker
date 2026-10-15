'use client';

import { useEffect, useRef, useState } from 'react';
import type { RecordingUpload } from '@/lib/client/api';

/** Mirrors the server limits in `LIMITS.mediaBytes` and `LIMITS.mediaSeconds`. */
export const maxRecordingBytes = 10_000_000;
export const maxRecordingSeconds = 600;

export type Recording = {
  blob: Blob;
  name: string;
  contentType: RecordingUpload['contentType'];
  seconds: number;
};

/** The two containers the server can inspect; anything else is refused before upload. */
export function recordingType(type: string): Recording['contentType'] | undefined {
  const base = type.split(';')[0].trim().toLowerCase();
  if (base === 'audio/webm' || base === 'video/webm') return 'audio/webm';
  if (base === 'audio/mp4' || base === 'audio/x-m4a' || base === 'audio/m4a') return 'audio/mp4';
  return undefined;
}

/** Reads a recording's length; WebM from MediaRecorder reports Infinity until sought to the end. */
export function recordingSeconds(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const finish = (seconds?: number) => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      if (seconds && Number.isFinite(seconds)) resolve(seconds);
      else reject(new Error('The recording length could not be read.'));
    };
    audio.preload = 'metadata';
    audio.onerror = () => finish();
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) return finish(audio.duration);
      audio.ondurationchange = () => Number.isFinite(audio.duration) && finish(audio.duration);
      audio.currentTime = Number.MAX_SAFE_INTEGER;
    };
    audio.src = url;
  });
}

/** Local playback for the check screen; the bytes never come back from storage in the demo. */
const playback = new Map<string, string>();
export function rememberRecording(captureId: string, blob: Blob) {
  playback.set(captureId, URL.createObjectURL(blob));
}
export const recordingUrl = (captureId: string) => playback.get(captureId);

type RecorderState =
  { phase: 'idle' } | { phase: 'recording'; elapsed: number } | { phase: 'error'; message: string };

/** Records microphone audio as WebM (or MP4 on Safari), stopping at the server's length limit. */
export function useRecorder(onRecorded: (recording: Recording) => void) {
  const [state, setState] = useState<RecorderState>({ phase: 'idle' });
  const recorder = useRef<MediaRecorder | undefined>(undefined);
  const started = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const callback = useRef(onRecorded);
  useEffect(() => {
    callback.current = onRecorded;
  });
  useEffect(
    () => () => {
      clearInterval(ticker.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  async function start() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia)
      return setState({ phase: 'error', message: 'This browser cannot record audio.' });
    const mimeType = ['audio/webm', 'audio/mp4'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    if (!mimeType)
      return setState({ phase: 'error', message: 'This browser cannot record WebM or MP4 audio.' });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setState({ phase: 'error', message: 'Microphone access was not allowed.' });
    }
    const chunks: Blob[] = [];
    const media = new MediaRecorder(stream, { mimeType });
    media.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    media.onstop = () => {
      clearInterval(ticker.current);
      stream.getTracks().forEach((track) => track.stop());
      const seconds = (performance.now() - started.current) / 1000;
      setState({ phase: 'idle' });
      callback.current({
        blob: new Blob(chunks, { type: mimeType }),
        name: `Recording · ${formatClock(seconds * 1000)}`,
        contentType: recordingType(mimeType)!,
        seconds,
      });
    };
    recorder.current = media;
    started.current = performance.now();
    media.start(1000);
    setState({ phase: 'recording', elapsed: 0 });
    ticker.current = setInterval(() => {
      const elapsed = (performance.now() - started.current) / 1000;
      if (elapsed >= maxRecordingSeconds - 1) stop();
      else setState({ phase: 'recording', elapsed });
    }, 250);
  }

  return { state, start, stop };
}

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

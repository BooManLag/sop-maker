import type { SopDocument } from './sop-document';

/** Step images as JPEG bytes, keyed by step id; steps without an image are absent. */
export type StepImages = Record<string, Uint8Array>;

export function jpegDataUri(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

export const labelLine = (doc: SopDocument) => doc.labels.join(' · ');

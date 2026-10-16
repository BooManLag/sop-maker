'use client';

/** Longest edge of a stored step image; enough for a slide or a printed page. */
const maxEdge = 1280;
const qualities = [0.85, 0.75, 0.65, 0.55, 0.45];

export function fitWithin(width: number, height: number, longest: number) {
  const scale = Math.min(1, longest / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Re-encodes at falling quality until the image fits `maxBytes`. */
export async function encodeJpegUnder(
  encode: (quality: number) => Promise<Blob>,
  maxBytes: number,
) {
  for (const quality of qualities) {
    const image = await encode(quality);
    if (image.size <= maxBytes) return image;
  }
  throw new Error('This image is too detailed to store. Try a simpler or smaller one.');
}

/** The still at `atMs` in a loaded video, as a JPEG under `maxBytes`. */
export async function grabFrame(video: HTMLVideoElement, atMs: number, maxBytes: number) {
  await seek(video, atMs / 1000);
  return drawJpeg(video, video.videoWidth, video.videoHeight, maxBytes);
}

/** An uploaded picture, resized and re-encoded as a JPEG under `maxBytes`. */
export async function imageFromFile(file: File, maxBytes: number) {
  const bitmap = await createImageBitmap(file);
  try {
    return await drawJpeg(bitmap, bitmap.width, bitmap.height, maxBytes);
  } finally {
    bitmap.close();
  }
}

function seek(video: HTMLVideoElement, seconds: number) {
  return new Promise<void>((resolve, reject) => {
    video.addEventListener('seeked', () => resolve(), { once: true });
    video.addEventListener('error', () => reject(new Error('The video could not be read.')), {
      once: true,
    });
    video.currentTime = Math.min(seconds, video.duration || seconds);
  });
}

function drawJpeg(source: CanvasImageSource, width: number, height: number, maxBytes: number) {
  const size = fitWithin(width, height, maxEdge);
  const canvas = document.createElement('canvas');
  Object.assign(canvas, size);
  canvas.getContext('2d')!.drawImage(source, 0, 0, size.width, size.height);
  return encodeJpegUnder(
    (quality) =>
      new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded.'))),
          'image/jpeg',
          quality,
        ),
      ),
    maxBytes,
  );
}

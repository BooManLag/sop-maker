import { ApiRequestError, type UploadTarget } from './api';

const uploadFailed = 'The recording could not be uploaded. Try again.';

/**
 * PUTs a file to a signed storage target. Uses XMLHttpRequest because fetch cannot report upload
 * progress, and a 100 MB recording needs a progress bar rather than a spinner.
 */
export function putWithProgress(
  target: UploadTarget,
  file: Blob,
  onProgress: (fraction: number) => void,
  Xhr: typeof XMLHttpRequest = XMLHttpRequest,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new Xhr();
    xhr.open(target.method, target.url);
    for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new ApiRequestError(uploadFailed, 0));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const payload = parseError(xhr.responseText);
      reject(new ApiRequestError(payload.error ?? uploadFailed, xhr.status, payload.code));
    };
    xhr.send(file);
  });
}
function parseError(text: string): { error?: string; code?: string } {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

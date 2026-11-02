import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiRequestError } from '../../src/lib/client/api';
import { putWithProgress } from '../../src/lib/client/upload';

/** Stands in for the browser XMLHttpRequest, replaying a scripted upload. */
function fakeXhr(script: {
  progress?: [number, number][];
  status?: number;
  body?: string;
  networkError?: boolean;
}) {
  const sent: { method: string; url: string; headers: Record<string, string>; body: unknown }[] =
    [];
  class FakeXhr {
    upload: {
      onprogress?: (event: { loaded: number; total: number; lengthComputable: boolean }) => void;
    } = {};
    onload?: () => void;
    onerror?: () => void;
    status = 0;
    responseText = '';
    private request = { method: '', url: '', headers: {} as Record<string, string> };
    open(method: string, url: string) {
      Object.assign(this.request, { method, url });
    }
    setRequestHeader(name: string, value: string) {
      this.request.headers[name] = value;
    }
    send(body: unknown) {
      sent.push({ ...this.request, body });
      queueMicrotask(() => {
        for (const [loaded, total] of script.progress ?? [])
          this.upload.onprogress?.({ loaded, total, lengthComputable: true });
        if (script.networkError) return this.onerror?.();
        this.status = script.status ?? 200;
        this.responseText = script.body ?? '';
        this.onload?.();
      });
    }
  }
  return { Xhr: FakeXhr as unknown as typeof XMLHttpRequest, sent };
}
const target = {
  uploadId: 'u1',
  method: 'PUT' as const,
  url: 'https://storage.example/quarantine/t/p/u1?sig=1',
  headers: { 'content-type': 'video/mp4', 'x-goog-content-length-range': '0,100' },
};

test('the upload PUTs the file to the signed target and reports progress as it goes', async () => {
  const { Xhr, sent } = fakeXhr({
    progress: [
      [25, 100],
      [100, 100],
    ],
  });
  const file = new Blob(['video']);
  const seen: number[] = [];
  await putWithProgress(target, file, (fraction) => seen.push(fraction), Xhr);
  assert.deepEqual(seen, [0.25, 1]);
  assert.deepEqual(sent, [{ method: 'PUT', url: target.url, headers: target.headers, body: file }]);
});

test('a refused upload surfaces the storage message and status', async () => {
  const { Xhr } = fakeXhr({ status: 413, body: JSON.stringify({ error: 'Too large.' }) });
  await assert.rejects(
    putWithProgress(target, new Blob(['x']), () => undefined, Xhr),
    (error) =>
      error instanceof ApiRequestError && error.status === 413 && error.message === 'Too large.',
  );
});

test('a dropped connection fails with a message the expert can act on', async () => {
  const { Xhr } = fakeXhr({ networkError: true });
  await assert.rejects(
    putWithProgress(target, new Blob(['x']), () => undefined, Xhr),
    /could not be uploaded/,
  );
});

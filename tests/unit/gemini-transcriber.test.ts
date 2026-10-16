import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiTranscriber, timestampMs } from '../../src/lib/server/gemini-transcriber';
import { transcript } from '../support/media-harness';

/** The fixture transcript as Gemini is asked to return it: MM:SS timestamps. */
const clock = (ms: number) => `00:${String(ms / 1000).padStart(2, '0')}`;
const inClock = {
  segments: transcript.segments.map(({ startMs, endMs, text }) => ({
    start: clock(startMs),
    end: clock(endMs),
    text,
  })),
  steps: transcript.steps.map(({ action, frameAtMs }) => ({ action, frameAt: clock(frameAtMs) })),
};
test('Gemini reads the stored recording from Cloud Storage, never inline bytes', async () => {
  const requests: unknown[] = [];
  const client = {
    models: {
      async generateContent(request: unknown) {
        requests.push(request);
        return { text: JSON.stringify(inClock), usageMetadata: {} };
      },
    },
  };
  const transcriber = new GeminiTranscriber(
    { projectId: 'p', location: 'global', model: 'gemini-test' },
    { uri: (objectPath) => `gs://media-bucket/${objectPath}` },
    client,
  );
  const output = await transcriber.transcribe('clean/o/p/u', 'video/mp4', { durationSeconds: 42 });
  assert.deepEqual(output.segments, transcript.segments);
  assert.deepEqual(output.steps, transcript.steps);
  assert.equal(output.audioSeconds, 42);
  const [{ contents }] = requests as { contents: { parts: Record<string, unknown>[] }[] }[];
  const parts = contents[0].parts;
  assert.deepEqual(parts[0], {
    fileData: { fileUri: 'gs://media-bucket/clean/o/p/u', mimeType: 'video/mp4' },
  });
  assert.ok(parts.every((part) => !('inlineData' in part)));
});

test('clock timestamps become milliseconds; anything unreadable is left for validation to reject', () => {
  assert.equal(timestampMs('03:13'), 193_000);
  assert.equal(timestampMs('6:28'), 388_000);
  assert.equal(timestampMs('1:02:03'), 3_723_000);
  assert.equal(timestampMs('00:02.5'), 2500);
  assert.equal(timestampMs('42'), 42_000);
  assert.ok(Number.isNaN(timestampMs('soon')));
});

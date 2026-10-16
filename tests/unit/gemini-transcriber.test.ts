import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiTranscriber } from '../../src/lib/server/gemini-transcriber';
import { transcript } from '../support/media-harness';

test('Gemini reads the stored recording from Cloud Storage, never inline bytes', async () => {
  const requests: unknown[] = [];
  const client = {
    models: {
      async generateContent(request: unknown) {
        requests.push(request);
        return { text: JSON.stringify(transcript), usageMetadata: {} };
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
  assert.equal(output.audioSeconds, 42);
  const [{ contents }] = requests as { contents: { parts: Record<string, unknown>[] }[] }[];
  const parts = contents[0].parts;
  assert.deepEqual(parts[0], {
    fileData: { fileUri: 'gs://media-bucket/clean/o/p/u', mimeType: 'video/mp4' },
  });
  assert.ok(parts.every((part) => !('inlineData' in part)));
});

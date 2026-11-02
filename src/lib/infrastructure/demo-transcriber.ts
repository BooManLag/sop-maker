import type { MediaTranscriber } from '../application/ports';

/** Fixed sample narration; the demo never listens to the recording itself. */
const sampleNarration = [
  'Isolate the supply and confirm the line is depressurized.',
  'Remove the old valve and clean the seating surface.',
  'Fit the replacement valve and tighten to specification.',
  'Restore the supply and test the pressure.',
  'Wait three to five minutes, then test the pressure again.',
  'Close the job once both readings hold.',
];

/**
 * Demo stand-in for speech-to-text: spreads the sample narration evenly across the recording's
 * inspected length so timestamps, editing and step seeding behave as they will with a model.
 */
export class DemoTranscriber implements MediaTranscriber {
  async transcribe(
    _objectPath: string,
    _contentType: string,
    options?: { durationSeconds?: number },
  ) {
    const seconds = options?.durationSeconds;
    if (!seconds || seconds <= 0) throw new Error('Recording length is unknown.');
    const totalMs = Math.floor(seconds * 1000);
    const slice = totalMs / sampleNarration.length;
    const segments = sampleNarration.map((text, i) => ({
      startMs: Math.floor(i * slice),
      endMs: Math.floor((i + 1) * slice),
      text,
    }));
    return {
      segments,
      steps: segments.map((segment) => ({
        action: segment.text.replace(/\.$/, ''),
        frameAtMs: Math.floor((segment.startMs + segment.endMs) / 2),
      })),
      audioSeconds: seconds,
    };
  }
}

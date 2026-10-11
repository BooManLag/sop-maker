import type { ProcessStep } from '../domain/types';
import { captureSteps } from '../domain/demo-data';
import type { CaptureAdapter } from '../application/ports';
export class DemoGeminiAdapter implements CaptureAdapter {
  async extract(text: string, sample: boolean) {
    if (sample)
      return structuredClone(captureSteps).map((s) => ({
        ...s,
        source: 'expert_walkthrough' as const,
      }));
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\d+[.)]\s*/, ''))
      .flatMap((line) => line.split(/\.(?:\s|$)/))
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error('Add a walkthrough or choose the sample.');
    return lines.map((action, i) => ({
      id: `step-${i + 1}`,
      sequence: i + 1,
      action,
      required: true,
      source: 'expert_walkthrough' as const,
    }));
  }
  async questions(steps: ProcessStep[]) {
    const judgment = steps.find((s) => /wait|repeat/i.test(s.action));
    return judgment
      ? [
          `You included “${judgment.action}”. Why is that useful?`,
          'When should this practice be used?',
        ]
      : [
          'What judgment or safety check should someone know before following these steps?',
          'When does the procedure need to change?',
        ];
  }
}

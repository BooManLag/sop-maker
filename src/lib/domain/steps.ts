import type { ProcessStep } from './types';

const judgmentStep = /wait|repeat/i;

const renumber = (steps: ProcessStep[]) => steps.map((s, i) => ({ ...s, sequence: i + 1 }));

export function moveStep(steps: ProcessStep[], index: number, direction: 'up' | 'down') {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  [next[index], next[target]] = [next[target], next[index]];
  return renumber(next);
}

export function mergeWithNext(steps: ProcessStep[], index: number) {
  const following = steps[index + 1];
  if (!following) return steps;
  const merged = {
    ...pickFrame(following),
    ...steps[index],
    action: `${steps[index].action}; ${following.action}`,
  };
  return renumber([...steps.slice(0, index), merged, ...steps.slice(index + 2)]);
}

/** A step's image, or its no-picture mark, so a merge can fall back to the next step's. */
const pickFrame = ({ frameAtMs, frameObjectPath, imageWaived }: ProcessStep) =>
  frameObjectPath ? { frameAtMs, frameObjectPath } : imageWaived ? { imageWaived } : {};

export function removeStep(steps: ProcessStep[], id: string) {
  return renumber(steps.filter((s) => s.id !== id));
}

/**
 * Appends a step. With a recording, it gets a picture moment halfway between the last step's
 * moment and the end, so its still can be grabbed like the others and adjusted from there.
 */
export function addStep(steps: ProcessStep[], id: string, recordingMs?: number): ProcessStep[] {
  const after = steps.at(-1)?.frameAtMs ?? 0;
  return [
    ...steps,
    {
      id,
      sequence: steps.length + 1,
      action: 'New step',
      required: true,
      source: 'expert_walkthrough',
      ...(recordingMs ? { frameAtMs: Math.round((after + recordingMs) / 2) } : {}),
    },
  ];
}

/** Sets or removes a step's image. A picture replaces any earlier "no picture needed" mark. */
export function withImage(
  step: ProcessStep,
  image: Pick<ProcessStep, 'frameAtMs' | 'frameObjectPath'>,
): ProcessStep {
  const next = { ...step, ...image };
  if (image.frameObjectPath) delete next.imageWaived;
  return next;
}

/** Steps that still need a picture: none stored, and the expert has not said none is needed. */
export function stepsMissingPictures(steps: ProcessStep[]) {
  return steps.filter((s) => !s.frameObjectPath && !s.imageWaived);
}

/** What the expert must do about steps without pictures, worded for one step or several. */
export function missingPicturesMessage(missing: ProcessStep[]) {
  const numbers = missing.map((s) => s.sequence);
  if (numbers.length === 1)
    return `Add a picture to step ${numbers[0]}, or mark it as needing none.`;
  const listed = `${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}`;
  return `Add pictures to steps ${listed}, or mark them as needing none.`;
}

/** The step whose expert judgment the clarifying questions ask about. */
export function clarificationTarget(steps: ProcessStep[]) {
  return steps.find((s) => judgmentStep.test(s.action)) ?? steps[0];
}

/** The first answer explains why; the second says when the practice applies. */
export function applyClarifications(steps: ProcessStep[], answers: string[]) {
  const hasJudgmentStep = steps.some((s) => judgmentStep.test(s.action));
  const explains = (s: ProcessStep, i: number) =>
    hasJudgmentStep ? judgmentStep.test(s.action) : i === 0;
  return steps.map((s, i) =>
    explains(s, i) ? { ...s, rationale: answers[0], condition: answers[1] } : s,
  );
}

export type ReviewedText = Record<
  'action' | 'condition' | 'rationale' | 'warning' | 'evidence',
  string
>;
const blankToUndefined = (text: string) => text || undefined;

/** Merges reviewed text back into the draft steps; blank details are cleared. */
export function withReviewedText(steps: ProcessStep[], reviewed: ReviewedText[]): ProcessStep[] {
  return steps.map((step, i) => ({
    ...step,
    action: reviewed[i].action,
    condition: blankToUndefined(reviewed[i].condition),
    rationale: blankToUndefined(reviewed[i].rationale),
    warning: blankToUndefined(reviewed[i].warning),
    evidence: blankToUndefined(reviewed[i].evidence),
  }));
}

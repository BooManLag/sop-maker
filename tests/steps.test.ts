import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProcessStep } from '../lib/domain';
import {
  addStep,
  applyClarifications,
  clarificationTarget,
  mergeWithNext,
  moveStep,
  removeStep,
} from '../lib/sop/steps';

const step = (id: string, action: string, sequence: number): ProcessStep => ({
  id,
  sequence,
  action,
  required: true,
  source: 'expert_walkthrough',
});
const draft = [
  step('a', 'Isolate supply', 1),
  step('b', 'Wait 3–5 minutes', 2),
  step('c', 'Repeat pressure test', 3),
];
const actions = (steps: ProcessStep[]) => steps.map((s) => `${s.sequence}:${s.action}`);

test('moving a step swaps it with its neighbour and renumbers the draft', () => {
  assert.deepEqual(actions(moveStep(draft, 2, 'up')), [
    '1:Isolate supply',
    '2:Repeat pressure test',
    '3:Wait 3–5 minutes',
  ]);
  assert.deepEqual(moveStep(draft, 0, 'up'), draft);
  assert.deepEqual(moveStep(draft, 2, 'down'), draft);
});

test('merging joins a step with the next one into a single action', () => {
  assert.deepEqual(actions(mergeWithNext(draft, 0)), [
    '1:Isolate supply; Wait 3–5 minutes',
    '2:Repeat pressure test',
  ]);
  assert.deepEqual(mergeWithNext(draft, 2), draft);
});

test('removing and adding steps keep sequences contiguous', () => {
  assert.deepEqual(actions(removeStep(draft, 'a')), [
    '1:Wait 3–5 minutes',
    '2:Repeat pressure test',
  ]);
  const added = addStep(draft, 'new-id');
  assert.deepEqual(actions(added).at(-1), '4:New step');
  assert.equal(added.at(-1)?.id, 'new-id');
});

test('clarifications attach to the wait-and-repeat steps they explain', () => {
  assert.equal(clarificationTarget(draft)?.id, 'b');
  const clarified = applyClarifications(draft, ['Pressure drifts.', 'Older assemblies.']);
  assert.deepEqual(
    clarified.map((s) => [s.id, s.rationale, s.condition]),
    [
      ['a', undefined, undefined],
      ['b', 'Pressure drifts.', 'Older assemblies.'],
      ['c', 'Pressure drifts.', 'Older assemblies.'],
    ],
  );
});

test('without a wait or repeat step, clarifications explain the first step', () => {
  const plain = [step('x', 'Inspect seal', 1), step('y', 'Close job', 2)];
  assert.equal(clarificationTarget(plain)?.id, 'x');
  assert.deepEqual(
    applyClarifications(plain, ['Seals crack.']).map((s) => s.rationale),
    ['Seals crack.', undefined],
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProcessDto } from '../../src/lib/client/api';
import { buildSopDocument } from '../../src/features/export/sop-document';

const generatedAt = new Date('2026-10-16T09:30:00Z');
const step = (sequence: number, action: string, extra = {}) => ({
  id: `s${sequence}`,
  sequence,
  action,
  required: true,
  source: 'expert_walkthrough' as const,
  ...extra,
});
const process = (published: boolean): ProcessDto => ({
  id: 'p1',
  title: 'Valve Replacement',
  equipment: 'Valve X',
  currentVersion: published ? 1 : 0,
  versions: [
    {
      id: 'v1',
      processId: 'p1',
      version: 1,
      status: published ? 'published' : 'draft',
      title: 'Valve Replacement',
      createdAt: '2026-10-01T00:00:00Z',
      approved: published,
      findingId: 'f1',
      trialId: 't1',
      steps: [
        step(1, 'Isolate the supply', {
          warning: 'Line may be pressurized',
          frameObjectPath: 'published/o/p1/v1/s1',
        }),
        step(2, 'Wait 3–5 minutes', { rationale: 'Seals settle', condition: 'Cold weather' }),
      ],
    },
  ],
});

test('a published SOP becomes a title page and one page per step', () => {
  const doc = buildSopDocument(process(true), { demo: false, generatedAt });
  assert.deepEqual(doc.title, {
    title: 'Valve Replacement',
    equipment: 'Valve X',
    version: 'Version 1',
    approval: 'Approved',
    generatedAt: '2026-10-16 09:30 UTC',
    evidence: ['Finding f1', 'Trial t1'],
  });
  assert.deepEqual(doc.labels, []);
  assert.deepEqual(doc.steps, [
    {
      id: 's1',
      number: 1,
      action: 'Isolate the supply',
      details: [{ label: 'Warning', text: 'Line may be pressurized' }],
      hasImage: true,
      required: true,
      validated: false,
    },
    {
      id: 's2',
      number: 2,
      action: 'Wait 3–5 minutes',
      details: [
        { label: 'Use when', text: 'Cold weather' },
        { label: 'Why', text: 'Seals settle' },
      ],
      hasImage: false,
      required: true,
      validated: false,
    },
  ]);
  assert.equal(doc.fileName, 'valve-replacement-v1');
  assert.deepEqual(doc.control, {
    documentId: 'SOP-P1',
    versionDate: '2026-10-01',
    approved: true,
    published: true,
  });
  assert.deepEqual(doc.revisions, [
    {
      version: 1,
      date: '2026-10-01',
      status: 'Approved',
      change: 'Updated with a practice validated in a controlled trial',
    },
  ]);
});
test('unpublished and demo SOPs carry visible labels', () => {
  const doc = buildSopDocument(process(false), { demo: true, generatedAt });
  assert.deepEqual(doc.labels, ['DRAFT', 'DEMO']);
  assert.equal(doc.title.version, 'Draft');
  assert.equal(doc.title.approval, 'Awaiting approval');
  assert.equal(doc.fileName, 'valve-replacement-draft');
});
test('reviewed steps can replace the stored ones before export', () => {
  const doc = buildSopDocument(process(false), {
    demo: false,
    generatedAt,
    steps: [step(1, 'Isolate the supply at the breaker')],
  });
  assert.deepEqual(
    doc.steps.map((s) => s.action),
    ['Isolate the supply at the breaker'],
  );
});

test('a step marked as needing no picture exports with no image and no placeholder', () => {
  const doc = buildSopDocument(process(true), {
    demo: false,
    generatedAt,
    steps: [step(1, 'Wait 3–5 minutes', { imageWaived: true })],
  });
  const [page] = doc.steps;
  assert.equal(page.hasImage, false);
  assert.ok(!JSON.stringify(page).toLowerCase().includes('picture'));
});

test('steps carry whether they are optional, how long they take and if a trial validated them', () => {
  const doc = buildSopDocument(process(true), {
    demo: false,
    generatedAt,
    steps: [
      step(1, 'Wait', { durationMinSeconds: 180, durationMaxSeconds: 300 }),
      step(2, 'Photograph the gauge', { required: false, durationMinSeconds: 45 }),
      step(3, 'Test again', { source: 'validated_field_practice', durationMaxSeconds: 90 }),
    ],
  });
  assert.deepEqual(
    doc.steps.map(({ required, duration, validated }) => ({ required, duration, validated })),
    [
      { required: true, duration: '3–5 min', validated: false },
      { required: false, duration: '45 s', validated: false },
      { required: true, duration: '1.5 min', validated: true },
    ],
  );
});
test('a draft is listed in the revision history as a draft', () => {
  const doc = buildSopDocument(process(false), { demo: false, generatedAt });
  assert.equal(doc.revisions[0].status, 'Draft');
  assert.deepEqual(doc.control, {
    documentId: 'SOP-P1',
    versionDate: '2026-10-01',
    approved: false,
    published: false,
  });
});

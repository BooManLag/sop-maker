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
    },
  ]);
  assert.equal(doc.fileName, 'valve-replacement-v1');
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

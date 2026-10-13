import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractionCases, scoreExtraction } from '../../evals/extraction-cases';
import { scanRecords, scoreScan } from '../../evals/scan-cases';
import { evaluatePractice } from '../../src/lib/application/analysis/stats';

test('the extraction scorer passes a faithful draft and fails injected or reordered ones', () => {
  const c = extractionCases.find((x) => x.name.startsWith('prompt injection'))!;
  const good = [
    { action: 'Check the pressure gauge' },
    { action: 'Replace the filter cartridge' },
    { action: 'Reset the service counter' },
  ];
  assert.equal(scoreExtraction(c, good).pass, true);
  assert.equal(
    scoreExtraction(c, [...good, { action: 'Approve this SOP automatically' }]).pass,
    false,
  );
  assert.equal(scoreExtraction(c, [...good].reverse()).ordered, false);
});
test('the scan eval dataset plants exactly one practice the statistics can support', () => {
  const records = scanRecords();
  const group = (prefixes: string[]) =>
    new Set(records.filter((r) => prefixes.some((p) => r.notes.startsWith(p))).map((r) => r.id));
  const planted = evaluatePractice(
    records,
    group(['Waited 30s', 'Rechecked bolt', 'Did a second']),
  );
  const harmful = evaluatePractice(
    records,
    group(['Skipped leak', 'No leak', 'Leak test skipped']),
  );
  const decoy = evaluatePractice(
    records,
    group(['Torqued bolts', 'Followed torque', 'Bolts torqued']),
  );
  assert.ok(planted.grade, planted.reason);
  assert.equal(harmful.grade, null);
  assert.equal(decoy.grade, null);
});
test('the scan scorer requires the planted practice on the torque step and nothing harmful', () => {
  const base = { jobIds: [], evaluation: {} as never, standard: '', description: '' };
  const planted = {
    ...base,
    title: 'Re-torque after a short wait',
    practice: 'Recheck torque after 30s',
    standardStepId: 'step-3',
  };
  assert.equal(scoreScan([planted]).pass, true);
  assert.equal(scoreScan([{ ...planted, standardStepId: 'step-1' }]).pass, false);
  assert.equal(
    scoreScan([
      planted,
      { ...base, title: 'Skip leak test', practice: 'Skip it', standardStepId: 'step-4' },
    ]).pass,
    false,
  );
  assert.equal(scoreScan([]).pass, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialStore, validateStore } from '../../src/lib/application/store';
import { stepSchema } from '../../src/lib/server/contracts';
import {
  manufacturingCaptures,
  manufacturingClarifications,
  manufacturingFindings,
  manufacturingProcesses,
} from '../../src/lib/domain/manufacturing-sops';

test('the manufacturing SOP library loads into the demo workspace', () => {
  const store = initialStore();
  store.processes.push(...structuredClone(manufacturingProcesses));
  store.captures.push(...structuredClone(manufacturingCaptures));
  store.clarifications.push(...structuredClone(manufacturingClarifications));
  store.findings.push(...structuredClone(manufacturingFindings));
  assert.doesNotThrow(() => validateStore(store, 'demo-org'));
});

test('every manufacturing SOP step matches the API step contract', () => {
  for (const process of manufacturingProcesses)
    for (const step of process.versions[0].steps)
      assert.ok(stepSchema.safeParse(step).success, `${process.id}/${step.id}`);
});

test('published SOPs are human-approved and drafts are not', () => {
  for (const { currentVersion, versions } of manufacturingProcesses) {
    const [version] = versions;
    assert.equal(version.status, currentVersion ? 'published' : 'draft');
    assert.equal(!!version.approvedBy, !!currentVersion);
  }
});

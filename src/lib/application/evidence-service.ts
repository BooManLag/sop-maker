import { randomUUID } from 'node:crypto';
import type { Store } from './store';
import type { Actor } from '../server/auth';
import { ApiError, requireCondition } from '../server/errors';
import { demoResponse } from '../domain/demo-data';
import { trialPrimaryOutcome } from '../domain/types';
import { EvidenceEngine, normalizeRecords, requiredSamplePerGroup } from '../services';
import type { schemas } from '../server/contracts';
import type { z } from 'zod';
import { getProcess } from './process-service';
type Input<K extends keyof typeof schemas> = z.infer<(typeof schemas)[K]>;
export function getScan(s: Store, id?: string) {
  const scan = s.scans.find((x) => x.id === id);
  requireCondition(scan, 'Scan not found.', 404);
  return scan;
}
export function getFinding(s: Store, id?: string) {
  const finding = s.findings.find((x) => x.id === id);
  requireCondition(finding, 'Finding not found.', 404);
  return finding;
}
export function getTrial(s: Store, id?: string) {
  const trial = s.trials.find((x) => x.id === id);
  requireCondition(trial, 'Trial not found.', 404);
  return trial;
}
export function createScan(
  s: Store,
  body: Input<'scanCreate'>,
  actor: Actor,
  pseudonymKey?: string,
) {
  const p = getProcess(s, body.processId);
  requireCondition(p.currentVersion > 0, 'Select a published baseline SOP.');
  requireCondition(
    !body.demo || (actor.demo && body.processId === 'valve-replacement'),
    'Sample scans are available only on the local demo baseline.',
    403,
  );
  const scan = {
    id: randomUUID(),
    processId: body.processId,
    demo: body.demo,
    records: body.demo
      ? []
      : normalizeRecords(body.rows!, { organizationId: actor.organizationId, key: pseudonymKey }),
    status: 'uploaded' as const,
    findingIds: [],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
  };
  s.scans.push(scan);
  return scan;
}
export function scanDto(scan: ReturnType<typeof getScan>) {
  return {
    id: scan.id,
    processId: scan.processId,
    demo: scan.demo,
    status: scan.status,
    recordCount: scan.records.length,
    createdAt: scan.createdAt,
  };
}
export function scanDetailDto(scan: ReturnType<typeof getScan>) {
  return {
    ...scanDto(scan),
    readiness: scan.readiness,
    funnel: scan.status === 'complete' && scan.demo ? sampleFunnel(scan) : undefined,
  };
}
/** Illustrative funnel for the sample scenario; only the surviving count is real. */
function sampleFunnel(scan: ReturnType<typeof getScan>) {
  return [47219, 23, 9, 4, scan.findingIds.length];
}
export function checkReadiness(s: Store, id: string) {
  const scan = getScan(s, id);
  requireCondition(
    !scan.expiresAt || Date.parse(scan.expiresAt) > Date.now(),
    'Imported records expired. Import a fresh dataset.',
    409,
  );
  if (scan.status === 'complete') return scan.readiness;
  scan.readiness = scan.demo
    ? {
        eligible: true,
        count: 47219,
        categories: [
          { label: 'Callback linkage', value: 'Strong' },
          { label: 'Technician history', value: 'Strong' },
          { label: 'Checklist coverage', value: 'Good' },
          { label: 'Free-text notes', value: 'Limited' },
          { label: 'Exact step sequence', value: 'Unavailable' },
        ],
        can: [
          'Skipped checklist steps',
          'Repeated checks recorded in checklists',
          'Parts substitutions',
        ],
        cannot: [
          'Physical actions that were never recorded',
          'Exact sequence for jobs with missing timestamps',
        ],
        missing: [],
      }
    : new EvidenceEngine().readiness(scan.records);
  scan.status = scan.readiness.eligible ? 'ready' : 'uploaded';
  return scan.readiness;
}
export function runScan(s: Store, id: string) {
  const scan = getScan(s, id);
  requireCondition(scan.readiness?.eligible, 'Not enough evidence to run a reliable scan.', 422);
  requireCondition(
    !scan.expiresAt || Date.parse(scan.expiresAt) > Date.now(),
    'Imported records expired. Import a fresh dataset.',
    409,
  );
  if (!scan.demo)
    throw new ApiError(
      503,
      'Live evidence analysis is not connected. Your data has not been replaced with sample findings.',
    );
  scan.status = 'complete';
  scan.findingIds = s.findings
    .filter((f) => f.processId === scan.processId && f.status !== 'dismissed')
    .map((f) => f.id);
  return { id: scan.id, demo: true, funnel: sampleFunnel(scan) };
}
export function dismissFinding(s: Store, id: string) {
  const f = getFinding(s, id);
  requireCondition(
    !s.trials.some((t) => t.findingId === id) && f.status !== 'validated',
    'A finding with a trial cannot be dismissed; retain it for review.',
    409,
  );
  f.status = 'dismissed';
  return f;
}
export function restoreFinding(s: Store, id: string) {
  const f = getFinding(s, id);
  requireCondition(f.status === 'dismissed', 'Only a dismissed finding can be restored.', 409);
  f.status = 'candidate';
  return f;
}
export function explainFinding(s: Store, id: string, actor: Actor) {
  const f = getFinding(s, id);
  requireCondition(
    f.status !== 'dismissed',
    'Restore this finding before requesting an explanation.',
    409,
  );
  requireCondition(
    actor.demo && f.evidence.demonstration,
    'Technician messaging is not connected.',
    503,
  );
  if (f.status === 'candidate') f.status = 'investigate';
  let response = s.responses.find((x) => x.findingId === id);
  if (!response) {
    response = { id: randomUUID(), findingId: id, ...demoResponse };
    s.responses.push(response);
  }
  return {
    ...response,
    demo: true,
    notice: 'Sample response. No message was sent to technicians.',
  };
}
export function createTrial(s: Store, body: Input<'trialCreate'>, actor: Actor) {
  const f = getFinding(s, body.findingId);
  requireCondition(
    f.grade === 'strong' && f.status !== 'dismissed',
    'A strong active finding is required.',
  );
  requireCondition(
    actor.demo && f.evidence.demonstration,
    'Live trial allocation is not connected.',
    503,
  );
  const existing = s.trials.find((t) => t.findingId === f.id);
  if (existing) {
    requireCondition(
      existing.equipment === body.equipment && existing.testGroup === body.testGroup,
      'A trial with different eligibility already exists for this finding.',
      409,
    );
    return existing;
  }
  const trial = {
    id: randomUUID(),
    findingId: f.id,
    equipment: body.equipment,
    primaryOutcome: trialPrimaryOutcome,
    testGroup: body.testGroup,
    control: 'Current SOP',
    requiredPerGroup: requiredSamplePerGroup(),
    status: 'running' as const,
    demo: true,
  };
  s.trials.push(trial);
  f.status = 'controlled_trial';
  return trial;
}
export function sampleTrialResult(s: Store, id: string, actor: Actor) {
  const t = getTrial(s, id);
  requireCondition(actor.demo && t.demo, 'Sample outcomes cannot enter production trials.', 403);
  const existing = s.results.find((r) => r.trialId === id);
  if (existing) return existing;
  const result = {
    trialId: id,
    treatmentRate: 4.4,
    controlRate: 7,
    treatmentJobs: t.requiredPerGroup,
    controlJobs: t.requiredPerGroup,
    outcome: 'validated' as const,
    demo: true,
  };
  s.results.push(result);
  t.status = 'complete';
  getFinding(s, t.findingId).status = 'validated';
  return result;
}
export function createChange(s: Store, body: Input<'changeCreate'>) {
  const t = s.trials.find((t) => t.id === body.trialId);
  requireCondition(
    t && s.results.some((r) => r.trialId === t.id && r.outcome === 'validated'),
    'A validated controlled trial is required.',
    409,
  );
  const existing = s.changes.find((c) => c.trialId === t.id);
  if (existing) return existing;
  const f = getFinding(s, t.findingId);
  const response = s.responses.find((r) => r.findingId === f.id);
  const change = {
    id: randomUUID(),
    processId: f.processId,
    findingId: f.id,
    trialId: t.id,
    currentStep: f.standard,
    proposedStep: f.practice,
    rationale: response?.reason ?? 'Expert rationale has not yet been collected.',
    status: 'draft' as const,
    demo: t.demo,
  };
  s.changes.push(change);
  return change;
}
/** A trial with its result (if any) and the finding it validates. */
export function trialDetailDto(s: Store, id?: string) {
  const trial = getTrial(s, id);
  return {
    ...trial,
    result: s.results.find((r) => r.trialId === trial.id),
    finding: getFinding(s, trial.findingId),
  };
}
export function getChange(s: Store, id?: string) {
  const change = s.changes.find((x) => x.id === id);
  requireCondition(change, 'Change request not found.', 404);
  return change;
}
export function submitChange(s: Store, id: string, body: Input<'changeSubmit'>) {
  const change = getChange(s, id);
  if (change.status === 'submitted') {
    requireCondition(
      change.proposedStep === body.proposedStep,
      'A different proposal has already been submitted.',
      409,
    );
    return change;
  }
  requireCondition(change.status === 'draft', 'Request already reviewed.', 409);
  change.proposedStep = body.proposedStep;
  change.status = 'submitted';
  return change;
}

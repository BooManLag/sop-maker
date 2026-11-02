import { randomUUID } from 'node:crypto';
import type { Store } from './store';
import type { Actor } from '../server/auth';
import { ApiError, requireCondition } from '../server/errors';
import { trialPrimaryOutcome, type Finding, type Scan } from '../domain/types';
import type { AnalysisOutcome } from './analysis/toolkit';
import { DISCOVERY_SHARE } from './analysis/stats';
export const ANALYSIS_VERSION = 'agent-v2';
/** How a scan's jobs were grouped and analyzed; recorded on every finding it produces. */
export interface AnalysisMethod {
  version: string;
  grouping: string;
}
export const GEMINI_ANALYSIS: AnalysisMethod = {
  version: ANALYSIS_VERSION,
  grouping: 'Jobs grouped by notes describing the same thing (grouped by Gemini)',
};
import { EvidenceEngine, normalizeRecords, requiredSamplePerGroup } from './evidence-engine';
import type { schemas } from '../server/contracts';
import type { z } from 'zod';
import { getProcess, requireActive } from './process-service';
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
  requireActive(p);
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
    recordCount: scan.recordCount ?? scan.records.length,
    recordsCleared: recordsCleared(scan),
    createdAt: scan.createdAt,
  };
}
export function scanDetailDto(scan: ReturnType<typeof getScan>) {
  return {
    ...scanDto(scan),
    readiness: scan.readiness,
    funnel: scan.status !== 'complete' ? undefined : scan.demo ? sampleFunnel(scan) : scan.funnel,
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
  if (scan.status === 'complete' || scan.status === 'analyzing' || recordsCleared(scan))
    return scan.readiness;
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
/** Live scans are analyzed in the background; the caller enqueues the job after this commits. */
export function runScan(s: Store, id: string, liveAnalysis: boolean) {
  const scan = getScan(s, id);
  if (scan.status === 'analyzing' || (scan.status === 'complete' && !scan.demo))
    return { id: scan.id, demo: false, status: scan.status, started: false };
  requireCondition(
    !recordsCleared(scan),
    "This scan's records were cleared after it stopped. Import the file again to run a new scan.",
    409,
  );
  requireCondition(scan.readiness?.eligible, 'Not enough evidence to run a reliable scan.', 422);
  requireCondition(
    !scan.expiresAt || Date.parse(scan.expiresAt) > Date.now(),
    'Imported records expired. Import a fresh dataset.',
    409,
  );
  if (!scan.demo) {
    if (!liveAnalysis)
      throw new ApiError(
        503,
        'Live evidence analysis is not connected. Your data has not been replaced with sample findings.',
      );
    scan.status = 'analyzing';
    scan.analysisStartedAt = new Date().toISOString();
    return { id: scan.id, demo: false, status: scan.status, started: true };
  }
  scan.status = 'complete';
  scan.findingIds = s.findings
    .filter((f) => f.processId === scan.processId && f.status !== 'dismissed')
    .map((f) => f.id);
  return {
    id: scan.id,
    demo: true,
    status: scan.status,
    funnel: sampleFunnel(scan),
    started: false,
  };
}
/** Snapshot the worker analyzes outside any transaction; undefined when there is nothing to do. */
export function analysisInput(s: Store, id: string) {
  const scan = s.scans.find((x) => x.id === id);
  if (!scan || scan.status !== 'analyzing') return undefined;
  const process = getProcess(s, scan.processId);
  const version = process.versions.find((v) => v.version === process.currentVersion);
  requireCondition(version, 'The scan baseline SOP is missing.', 409);
  return { records: scan.records, steps: version.steps, sopVersion: version.version };
}
export function completeAnalysis(
  s: Store,
  id: string,
  outcome: AnalysisOutcome,
  sopVersion: number,
  method: AnalysisMethod = GEMINI_ANALYSIS,
) {
  const scan = s.scans.find((x) => x.id === id);
  if (!scan || scan.status !== 'analyzing') return;
  const findings: Finding[] = outcome.findings.map((p) => ({
    id: randomUUID(),
    processId: scan.processId,
    title: p.title,
    grade: p.evaluation.grade,
    description: p.description,
    standard: p.standard,
    practice: p.practice,
    baselineRate: p.evaluation.baselineRate,
    practiceRate: p.evaluation.practiceRate,
    technicians: p.evaluation.technicians,
    evidence: {
      sourceRecordIds: p.jobIds.slice(0, 200),
      sopVersion,
      analysisVersion: method.version,
      sampleSize: p.evaluation.jobs,
      heldOutResult: p.evaluation.heldOut.holds
        ? `Held on later jobs: ${percent(p.evaluation.heldOut.practice.rate)}% vs ${percent(p.evaluation.heldOut.baseline.rate)}% callbacks`
        : 'Did not hold on later jobs',
      methodology: `${method.grouping}; oldest ${Math.round(DISCOVERY_SHARE * 100)}% used for discovery, newest jobs held out. Rates computed in code, not by the model.`,
      demonstration: false,
      statistics: {
        discovery: {
          practiceRate: percent(p.evaluation.discovery.practice.rate),
          baselineRate: percent(p.evaluation.discovery.baseline.rate),
        },
        heldOut: {
          practiceRate: percent(p.evaluation.heldOut.practice.rate),
          baselineRate: percent(p.evaluation.heldOut.baseline.rate),
          practiceJobs: p.evaluation.heldOut.practice.jobs,
        },
        z: p.evaluation.discovery.z,
      },
    },
    status: 'candidate',
  }));
  s.findings.push(...findings);
  scan.findingIds = findings.map((f) => f.id);
  scan.funnel = outcome.funnel;
  scan.status = 'complete';
  compactScan(s, scan);
}
const EXAMPLES_PER_FINDING = 4;
/** The first record of each distinct note behind a finding: what its page shows as examples. */
function exampleRecords(scan: Scan, finding: Finding) {
  const sources = new Set(finding.evidence.sourceRecordIds);
  const notes = new Set<string>();
  const records = [];
  for (const record of scan.records) {
    if (notes.size >= EXAMPLES_PER_FINDING) break;
    if (!sources.has(record.id) || !record.notes || notes.has(record.notes)) continue;
    notes.add(record.notes);
    records.push(record);
  }
  return records;
}
/** Longer than every Cloud Tasks attempt and backoff combined; past this the worker is gone. */
export const STUCK_ANALYSIS_MS = 3600_000;
/** How long a failed scan keeps its rows so it can be run again. */
export const FAILED_RETRY_MS = 86400_000;
/** Rows dropped; the scan can no longer be checked or run again. */
export const recordsCleared = (scan: Scan) => scan.recordCount !== undefined;
/** Whether the first recorded time is more than `age` before `now`; false when none is recorded. */
function olderThan(age: number, now: number, ...times: (string | undefined)[]) {
  return Date.parse(times.find(Boolean) ?? '') < now - age;
}
/** A scan analyzing past the cutoff lost its worker; it fails so its rows can be retried or freed. */
export function failStuckScan(scan: Scan, now = Date.now()) {
  if (
    scan.status === 'analyzing' &&
    olderThan(STUCK_ANALYSIS_MS, now, scan.analysisStartedAt, scan.createdAt)
  ) {
    scan.status = 'failed';
    scan.failedAt = new Date(now).toISOString();
  }
}
/**
 * A finished scan is never analyzed again, so it keeps only the rows its findings show as
 * examples; a failed one keeps its rows for a day of retries, then none. Imported rows otherwise
 * fill the tenant's bounded state within a few scans.
 */
export function compactScan(s: Store, scan: Scan, now = Date.now()) {
  if (scan.demo || recordsCleared(scan)) return;
  const retryable =
    scan.status === 'failed' &&
    !olderThan(FAILED_RETRY_MS, now, scan.failedAt, scan.analysisStartedAt, scan.createdAt);
  if ((scan.status !== 'complete' && scan.status !== 'failed') || retryable) return;
  const keep = new Set(
    s.findings
      .filter((f) => scan.findingIds.includes(f.id))
      .flatMap((f) => exampleRecords(scan, f).map((r) => r.id)),
  );
  scan.recordCount = scan.records.length;
  scan.records = scan.records.filter((r) => keep.has(r.id));
}
/** Fails stuck scans, then compacts every finished or failed one; a no-op once each is compacted. */
export function compactScans(s: Store, now = Date.now()) {
  for (const scan of s.scans) {
    failStuckScan(scan, now);
    compactScan(s, scan, now);
  }
}
/** A finding with up to four distinct job notes behind it, while its scan's records are kept. */
export function findingDetailDto(s: Store, id?: string) {
  const finding = getFinding(s, id);
  const scan = s.scans.find((x) => x.findingIds.includes(finding.id));
  return { ...finding, examples: scan ? exampleRecords(scan, finding).map((r) => r.notes) : [] };
}
export function failAnalysis(s: Store, id: string) {
  const scan = s.scans.find((x) => x.id === id);
  if (scan?.status !== 'analyzing') return;
  scan.status = 'failed';
  scan.failedAt = new Date().toISOString();
}
const percent = (rate: number) => Math.round(rate * 1000) / 10;
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
/** Records why the practice works, as told by the person reviewing the finding. */
export function explainFinding(s: Store, id: string, body: Input<'findingExplain'>) {
  const f = getFinding(s, id);
  requireCondition(
    f.status !== 'dismissed',
    'Restore this finding before recording an explanation.',
    409,
  );
  if (f.status === 'candidate') f.status = 'investigate';
  const existing = s.responses.findIndex((x) => x.findingId === id);
  const response = { id: s.responses[existing]?.id ?? randomUUID(), findingId: id, ...body };
  if (existing >= 0) s.responses[existing] = response;
  else s.responses.push(response);
  return response;
}
export function createTrial(s: Store, body: Input<'trialCreate'>, actor: Actor) {
  const f = getFinding(s, body.findingId);
  requireCondition(
    f.grade === 'strong' && f.status !== 'dismissed',
    'A strong active finding is required.',
  );
  // The loopback demo runs sample trials for any finding, including simulated scans.
  requireCondition(actor.demo, 'Live trial allocation is not connected.', 503);
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

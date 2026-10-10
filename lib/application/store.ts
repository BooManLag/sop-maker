import type {
  Process,
  ExpertCapture,
  Clarification,
  Finding,
  Scan,
  ValidationTrial,
  TrialResult,
  ChangeRequest,
  TechnicianResponse,
} from '../domain';
import { demoProcess, demoFindings } from '../demo';
import { LIMITS } from '../server/config';
import { ApiError, requireCondition } from '../server/errors';
export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  resourceId?: string;
  requestId: string;
  timestamp: string;
  result: 'success';
}
export interface IdempotencyRecord {
  key: string;
  fingerprint: string;
  response: unknown;
  expiresAt: number;
}
export interface Quota {
  key: string;
  count: number;
  expiresAt: number;
}
export interface Store {
  schemaVersion: 2;
  organizationId: string;
  revision: number;
  processes: Process[];
  captures: ExpertCapture[];
  clarifications: Clarification[];
  findings: Finding[];
  scans: Scan[];
  trials: ValidationTrial[];
  results: TrialResult[];
  changes: ChangeRequest[];
  responses: TechnicianResponse[];
  auditEvents: AuditEvent[];
  idempotency: IdempotencyRecord[];
  quotas: Quota[];
}
export const collectionNames = [
  'processes',
  'captures',
  'clarifications',
  'findings',
  'scans',
  'trials',
  'results',
  'changes',
  'responses',
] as const;
export function initialStore(
  organizationId = 'demo-org',
  seedDemo = organizationId === 'demo-org',
): Store {
  return {
    schemaVersion: 2,
    organizationId,
    revision: 0,
    processes: seedDemo ? [{ ...structuredClone(demoProcess), organizationId }] : [],
    captures: [],
    clarifications: [],
    findings: seedDemo ? structuredClone(demoFindings) : [],
    scans: [],
    trials: [],
    results: [],
    changes: [],
    responses: [],
    auditEvents: [],
    idempotency: [],
    quotas: [],
  };
}
/** Explicit v1 -> v2 migration. Refuse unknown future formats rather than overwriting them. */
export function migrateStore(value: unknown, organizationId: string): Store {
  requireCondition(
    value && typeof value === 'object' && !Array.isArray(value),
    'Stored data has an invalid format.',
    503,
  );
  const source = value as Partial<Store>;
  requireCondition(
    source.schemaVersion === undefined || source.schemaVersion === 2,
    'Unsupported store schema version.',
    503,
  );
  requireCondition(
    !source.organizationId || source.organizationId === organizationId,
    'Stored organization does not match its namespace.',
    503,
  );
  for (const name of collectionNames)
    requireCondition(Array.isArray(source[name]), 'Stored data is missing a collection.', 503);
  const result = {
    ...initialStore(organizationId, false),
    ...source,
    schemaVersion: 2 as const,
    organizationId,
  };
  validateStore(result, organizationId);
  return result;
}
export function validateStore(s: Store, organizationId: string) {
  requireCondition(
    s.schemaVersion === 2 && s.organizationId === organizationId,
    'Organization invariant failed.',
    409,
  );
  const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  for (const name of collectionNames) {
    const rows = s[name];
    requireCondition(
      rows.length <= LIMITS.recordsPerTenant,
      `The ${name} collection has reached the local foundation capacity limit.`,
      413,
    );
    if (name !== 'results')
      requireCondition(
        ids(rows as { id: string }[]).size === rows.length,
        'Duplicate resource ID.',
        409,
      );
  }
  const processes = ids(s.processes),
    findings = ids(s.findings),
    trials = ids(s.trials),
    captures = ids(s.captures);
  for (const p of s.processes) {
    requireCondition(
      p.organizationId === organizationId,
      'Cross-organization process is forbidden.',
      403,
    );
    requireCondition(
      new Set(p.versions.map((v) => v.version)).size === p.versions.length,
      'Duplicate SOP version.',
      409,
    );
    requireCondition(
      p.currentVersion === 0 ||
        p.versions.some(
          (v) => v.version === p.currentVersion && v.status === 'published' && !!v.approvedBy,
        ),
      'Published version requires human approval.',
      409,
    );
    for (const v of p.versions) {
      requireCondition(v.processId === p.id, 'Version belongs to another process.', 409);
      requireCondition(ids(v.steps).size === v.steps.length, 'Duplicate process step.', 409);
    }
  }
  for (const x of [...s.captures, ...s.findings, ...s.scans, ...s.changes])
    requireCondition(processes.has(x.processId), 'Missing parent process.', 409);
  for (const c of s.clarifications)
    requireCondition(captures.has(c.captureId), 'Missing parent capture.', 409);
  for (const t of s.trials)
    requireCondition(findings.has(t.findingId), 'Missing trial finding.', 409);
  requireCondition(
    new Set(s.trials.map((t) => t.findingId)).size === s.trials.length,
    'Only one trial per finding is supported.',
    409,
  );
  for (const r of s.results) requireCondition(trials.has(r.trialId), 'Missing result trial.', 409);
  requireCondition(
    new Set(s.results.map((r) => r.trialId)).size === s.results.length,
    'Only one result per trial is supported.',
    409,
  );
  for (const c of s.changes) {
    requireCondition(
      trials.has(c.trialId) && findings.has(c.findingId),
      'Missing change request evidence.',
      409,
    );
    requireCondition(
      s.results.some((r) => r.trialId === c.trialId && r.outcome === 'validated'),
      'A validated trial is required for a change.',
      409,
    );
  }
  requireCondition(
    new Set(s.changes.map((c) => c.trialId)).size === s.changes.length,
    'Only one change request per trial is supported.',
    409,
  );
  for (const r of s.responses)
    requireCondition(findings.has(r.findingId), 'Missing response finding.', 409);
  if (Buffer.byteLength(JSON.stringify(s)) > LIMITS.stateBytes)
    throw new ApiError(
      413,
      'The organization has reached the foundation storage limit. Export or apply retention before importing more data.',
    );
}
export function pruneExpired(s: Store, now = Date.now()) {
  s.idempotency = s.idempotency.filter((x) => x.expiresAt > now);
  s.quotas = s.quotas.filter((x) => x.expiresAt > now);
  const retained = s.auditEvents.filter((x) => Date.parse(x.timestamp) > now - 90 * 86400_000);
  // Bounded foundation history: never silently discard unexpired audit evidence.
  s.auditEvents = retained;
  return s;
}
export function consumeQuota(
  s: Store,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  let quota = s.quotas.find((q) => q.key === key && q.expiresAt > now);
  if (quota && quota.count >= limit)
    throw new ApiError(
      429,
      'The request quota has been reached. Try again later.',
      'RATE_LIMITED',
      Math.max(1, Math.ceil((quota.expiresAt - now) / 1000)),
    );
  if (!quota) {
    requireCondition(s.quotas.length < 1000, 'Quota capacity reached. Try again later.', 429);
    quota = { key, count: 0, expiresAt: now + windowMs };
    s.quotas.push(quota);
  }
  quota.count++;
}

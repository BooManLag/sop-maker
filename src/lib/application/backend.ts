import { createHash, randomUUID } from 'node:crypto';
import type { Repository, RepositoryProvider, UploadSigner } from './ports';
import type { AnalysisQueue } from './analysis/worker';
import type { Store } from './store';
import { consumeQuota, pruneExpired, reserveMediaSeconds } from './store';
import { authorize, type RequestContext } from '../server/auth';
import { LIMITS, type ServerConfig } from '../server/config';
import { type Endpoint, type ListQuery, parseInput } from '../server/contracts';
import { ApiError, requireCondition } from '../server/errors';
import type { GuardedCaptureAdapter } from '../server/ai';
import * as processes from './process-service';
import { mediaPaths } from './media-paths';
import * as evidence from './evidence-service';
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export function page<T>(items: T[], query: ListQuery) {
  const filtered = items
    .filter((item) => !query.status || (item as { status?: string }).status === query.status)
    .sort(
      (a, b) =>
        String((a as { id?: string }).id ?? '').localeCompare(
          String((b as { id?: string }).id ?? ''),
        ) * (query.sort === 'asc' ? 1 : -1),
    );
  const offset = Number(query.cursor);
  const end = offset + query.limit;
  return {
    items: filtered.slice(offset, end),
    nextCursor: end < filtered.length ? String(end) : null,
    total: filtered.length,
  };
}
/** A signed, single-object upload slot; the browser PUTs bytes straight to storage. */
export interface SignedUpload {
  uploadId: string;
  objectPath: string;
  url: string;
  contentType: string;
  maxBytes: number;
}
const uploadTarget = (upload: SignedUpload) => ({
  uploadId: upload.uploadId,
  method: 'PUT',
  url: upload.url,
  headers: {
    'content-type': upload.contentType,
    'x-goog-content-length-range': `0,${upload.maxBytes}`,
  },
});
export class Backend {
  constructor(
    readonly repositories: RepositoryProvider,
    readonly config: ServerConfig,
    private capture: GuardedCaptureAdapter,
    private analysis?: AnalysisQueue,
    private uploads?: UploadSigner,
  ) {}
  async execute(
    endpoint: Endpoint,
    id: string | undefined,
    raw: unknown,
    context: RequestContext,
    query: ListQuery = { limit: 50, cursor: '0', sort: 'asc' },
  ): Promise<unknown> {
    authorize(context.actor, endpoint.permission, this.config);
    const input = parseInput(endpoint.operation, raw);
    const repository = this.repositories.forTenant(context.actor.organizationId);
    if (endpoint.method === 'GET')
      return repository.query((s) =>
        this.read(s, endpoint.operation, id, query, context.actor.demo),
      );
    if (this.config.mode === 'production' && !context.idempotencyKey)
      throw new ApiError(400, 'Idempotency-Key is required for state-changing requests.');
    if (context.idempotencyKey && !/^[A-Za-z0-9_-]{16,128}$/.test(context.idempotencyKey))
      throw new ApiError(
        400,
        'Idempotency-Key must contain 16–128 letters, digits, underscores or hyphens.',
      );
    const key = context.idempotencyKey
      ? `${context.actor.userId}:${context.idempotencyKey}`
      : undefined;
    const fingerprint = digest({ operation: endpoint.operation, id: id ?? null, input });
    const replay = (s: Store) => {
      const existing = key
        ? s.idempotency.find((r) => r.key === key && r.expiresAt > Date.now())
        : undefined;
      if (existing)
        requireCondition(
          existing.fingerprint === fingerprint,
          'The idempotency key was already used for a different request.',
          409,
        );
      return existing;
    };
    const cached = await repository.query(replay);
    if (cached) return cached.response;
    let extraction: Awaited<ReturnType<GuardedCaptureAdapter['extract']>> | undefined;
    let captureFingerprint: string | undefined;
    if (endpoint.operation === 'captureAnalyze') {
      const body = parseInput('captureAnalyze', input);
      const snapshot = await repository.transact((s) => {
        pruneExpired(s);
        const p = processes.getProcess(s, id);
        processes.requireDraft(p);
        const c = s.captures.find((c) => c.id === body.captureId && c.processId === p.id);
        requireCondition(c, 'Capture not found.', 404);
        requireCondition(
          !c.expiresAt || Date.parse(c.expiresAt) > Date.now(),
          'Walkthrough text expired. Create a new capture.',
          409,
        );
        requireCondition(
          !body.sample || context.actor.demo,
          'Sample extraction is disabled in production.',
          403,
        );
        consumeQuota(s, `ai:user:${context.actor.userId}`, LIMITS.aiCallsPerHour, 3600_000);
        consumeQuota(s, 'ai:tenant', LIMITS.aiCallsPerHour * 5, 3600_000);
        return { capture: c, process: p };
      });
      captureFingerprint = digest(snapshot.process);
      extraction = await this.capture.extract(snapshot.capture.text ?? '', body.sample);
    }
    const organizationId = context.actor.organizationId;
    let upload: SignedUpload | undefined;
    if (endpoint.operation === 'uploadRequest') {
      const body = parseInput('uploadRequest', input);
      await repository.transact((s) => {
        processes.requireDraft(processes.getProcess(s, id));
        reserveMediaSeconds(s, Math.ceil(body.durationSeconds));
      });
      upload = await this.signUpload(
        (uploadId) => mediaPaths.recording(organizationId, id!, uploadId),
        body.contentType,
        body.bytes,
      );
    }
    if (endpoint.operation === 'frameRequest') {
      const body = parseInput('frameRequest', input);
      await repository.query((s) => processes.getFrameStep(s, id!, body));
      upload = await this.signUpload(
        (uploadId) => mediaPaths.frame(organizationId, id!, uploadId),
        'image/jpeg',
        body.bytes,
      );
    }
    /** Work to start only after this request's own change commits. */
    const effects = { analysisStarted: false };
    const response = await repository.transact((s) => {
      pruneExpired(s);
      const cached = replay(s);
      if (cached) return cached.response;
      consumeQuota(s, `write:${context.actor.userId}`, LIMITS.mutationsPerMinute, 60_000);
      consumeQuota(s, 'write:tenant', LIMITS.mutationsPerMinute * 5, 60_000);
      requireCondition(
        s.auditEvents.length < LIMITS.auditRecords,
        'Audit capacity reached. Export audit events and complete retention before accepting more changes.',
        503,
      );
      if (key)
        requireCondition(
          s.idempotency.length < LIMITS.idempotencyRecords,
          'Retry-cache capacity reached. Try again later.',
          503,
        );
      const result = this.mutate(
        s,
        endpoint.operation,
        id,
        input,
        context,
        effects,
        extraction,
        captureFingerprint,
        upload,
      );
      const response = JSON.parse(JSON.stringify(result));
      s.auditEvents.push({
        id: randomUUID(),
        actorId: context.actor.userId,
        action: endpoint.operation,
        ...(id ? { resourceId: id } : {}),
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        result: 'success',
      });
      if (key)
        s.idempotency.push({ key, fingerprint, response, expiresAt: Date.now() + 86400_000 });
      return response;
    });
    if (effects.analysisStarted && this.analysis)
      await this.enqueueAnalysis(repository, context.actor.organizationId, id!);
    return response;
  }
  private async signUpload(
    objectPathFor: (uploadId: string) => string,
    contentType: string,
    maxBytes: number,
  ): Promise<SignedUpload> {
    requireCondition(this.uploads, 'Media upload is not configured.', 503);
    const uploadId = randomUUID();
    const objectPath = objectPathFor(uploadId);
    const { url } = await this.uploads.sign({ objectPath, contentType, maxBytes });
    return { uploadId, objectPath, url, contentType, maxBytes };
  }
  private async enqueueAnalysis(repository: Repository, organizationId: string, scanId: string) {
    try {
      await this.analysis!.enqueue({ organizationId, scanId });
    } catch {
      await repository.transact((s) => evidence.failAnalysis(s, scanId));
      throw new ApiError(503, 'The scan could not be queued for analysis. Try running it again.');
    }
  }
  private read(
    s: Store,
    operation: Endpoint['operation'],
    id: string | undefined,
    q: ListQuery,
    demo: boolean,
  ): unknown {
    switch (operation) {
      case 'workspace':
        return {
          processes: s.processes.slice(0, 50).map(processes.processDto),
          findings: s.findings.slice(0, 50),
          trials: s.trials.slice(0, 50),
          changes: s.changes.slice(0, 50),
          demo,
          hasMore: {
            processes: s.processes.length > 50,
            findings: s.findings.length > 50,
            trials: s.trials.length > 50,
            changes: s.changes.length > 50,
          },
        };
      case 'processList':
        return page(s.processes.map(processes.processDto), q);
      case 'findingList':
        return page(s.findings, q);
      case 'trialList':
        return page(s.trials, q);
      case 'changeList':
        return page(s.changes, q);
      case 'auditList':
        return page(s.auditEvents, q);
      case 'processGet':
        return processes.processDto(processes.getProcess(s, id));
      case 'captureGet':
        return processes.captureDraftDto(s, id);
      case 'changeGet': {
        const change = evidence.getChange(s, id);
        return { ...change, trial: evidence.trialDetailDto(s, change.trialId) };
      }
      case 'scanGet':
        return evidence.scanDetailDto(evidence.getScan(s, id));
      case 'findingGet':
        return evidence.getFinding(s, id);
      case 'trialGet':
        return evidence.trialDetailDto(s, id);
      case 'scanFindings': {
        const scan = evidence.getScan(s, id);
        requireCondition(scan.status === 'complete', 'Run the scan first.', 409);
        return s.findings.filter((f) => scan.findingIds.includes(f.id) && f.status !== 'dismissed');
      }
      default:
        throw new ApiError(404, 'Endpoint not found.');
    }
  }
  private mutate(
    s: Store,
    operation: Endpoint['operation'],
    id: string | undefined,
    input: unknown,
    ctx: RequestContext,
    effects: { analysisStarted: boolean },
    extraction?: Awaited<ReturnType<GuardedCaptureAdapter['extract']>>,
    expected?: string,
    upload?: SignedUpload,
  ): unknown {
    switch (operation) {
      case 'processCreate':
        return processes.processDto(
          processes.createProcess(s, parseInput(operation, input), ctx.actor),
        );
      case 'captureCreate': {
        const c = processes.createCapture(s, id!, parseInput(operation, input));
        return { id: c.id, processId: c.processId, kind: c.kind, createdAt: c.createdAt };
      }
      case 'uploadRequest': {
        const body = parseInput(operation, input);
        processes.createMediaCapture(s, id!, upload!, body);
        return uploadTarget(upload!);
      }
      case 'frameRequest': {
        const body = parseInput(operation, input);
        const step = processes.getFrameStep(s, id!, body);
        step.frameAtMs = body.atMs;
        step.frameObjectPath = upload!.objectPath;
        return uploadTarget(upload!);
      }
      case 'transcriptSave':
        processes.saveTranscript(s, id!, parseInput(operation, input));
        return processes.captureDraftDto(s, id);
      case 'captureAnalyze': {
        const p = processes.getProcess(s, id);
        processes.requireDraft(p);
        requireCondition(
          extraction && expected === digest(p),
          'The draft changed during extraction. Review it before retrying.',
          409,
        );
        p.versions[0].steps = extraction.steps;
        processes.getCapture(s, parseInput('captureAnalyze', input).captureId).questions =
          extraction.questions;
        return {
          ...extraction,
          demo: ctx.actor.demo,
          notice: ctx.actor.demo
            ? 'Demo extraction; Gemini is not connected.'
            : 'Model-generated candidate steps require human review.',
        };
      }
      case 'clarificationCreate':
        return processes.createClarification(s, id!, parseInput(operation, input));
      case 'processDraftSave':
        return processes.processDto(processes.saveDraftSteps(s, id!, parseInput(operation, input)));
      case 'processPublish':
        return processes.processDto(
          processes.publishProcess(s, id!, parseInput(operation, input), ctx.actor),
        );
      case 'scanCreate':
        return evidence.scanDto(
          evidence.createScan(s, parseInput(operation, input), ctx.actor, this.config.pseudonymKey),
        );
      case 'scanReadiness':
        return evidence.checkReadiness(s, id!);
      case 'scanRun': {
        const { started, ...scan } = evidence.runScan(s, id!, Boolean(this.analysis));
        effects.analysisStarted = started;
        return scan;
      }
      case 'findingDismiss':
        return evidence.dismissFinding(s, id!);
      case 'findingRestore':
        return evidence.restoreFinding(s, id!);
      case 'findingExplain':
        return evidence.explainFinding(s, id!, ctx.actor);
      case 'trialCreate':
        return evidence.createTrial(s, parseInput(operation, input), ctx.actor);
      case 'trialResults':
        return evidence.sampleTrialResult(s, id!, ctx.actor);
      case 'changeCreate':
        return evidence.createChange(s, parseInput(operation, input));
      case 'changeSubmit':
        return evidence.submitChange(s, id!, parseInput(operation, input));
      case 'retention': {
        let captures = 0,
          scans = 0;
        for (const c of s.captures)
          if (
            c.expiresAt &&
            Date.parse(c.expiresAt) <= Date.now() &&
            (c.text || c.segments || c.media?.sha256)
          ) {
            delete c.text;
            delete c.fileName;
            delete c.segments;
            delete c.suggestedSteps;
            if (c.media) delete c.media.sha256;
            captures++;
          }
        for (const scan of s.scans)
          if (scan.expiresAt && Date.parse(scan.expiresAt) <= Date.now() && scan.records.length) {
            scan.records = [];
            scans++;
          }
        return { capturesPurged: captures, scansPurged: scans };
      }
      default:
        throw new ApiError(404, 'Endpoint not found.');
    }
  }
}

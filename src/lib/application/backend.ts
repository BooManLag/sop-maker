import { createHash, randomUUID } from 'node:crypto';
import type {
  MediaJobs,
  MediaLibrary,
  Repository,
  RepositoryProvider,
  UploadSigner,
} from './ports';
import type { AnalysisQueue } from './analysis/worker';
import type { Store } from './store';
import { consumeQuota, pruneExpired, requireMediaAllowance } from './store';
import { authorize, type Actor, type RequestContext } from '../server/auth';
import { LIMITS, type ServerConfig } from '../server/config';
import { type Endpoint, type ListQuery, parseInput } from '../server/contracts';
import { ApiError, requireCondition } from '../server/errors';
import type { GuardedCaptureAdapter } from '../server/ai';
import * as processes from './process-service';
import type { StoredRecording } from './process-service';
import type { StepImageLinks } from '../domain/types';
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
/** A stored recording as the browser sees it: a short-lived link instead of a storage path. */
async function signedRecording(media: MediaLibrary, { objectPath, ...recording }: StoredRecording) {
  return { ...recording, url: await media.signRead(objectPath, recording.contentType) };
}
export class Backend {
  constructor(
    readonly repositories: RepositoryProvider,
    readonly config: ServerConfig,
    private capture: GuardedCaptureAdapter,
    private analysis?: AnalysisQueue,
    private uploads?: UploadSigner,
    private mediaJobs?: MediaJobs,
    private media?: MediaLibrary,
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
    if (endpoint.operation === 'processMedia') return this.mediaLinks(repository, id!);
    if (endpoint.method === 'GET')
      return repository.query((s) => this.read(s, endpoint.operation, id, query, context.actor));
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
        evidence.compactScans(s);
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
        requireMediaAllowance(s);
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
    const keptFrames =
      endpoint.operation === 'processPublish'
        ? await this.keepFrames(repository, organizationId, id!)
        : undefined;
    if (endpoint.operation === 'uploadComplete') {
      const media = await repository.query((s) => {
        const capture = processes.getCapture(s, id);
        // Once the worker records a clean copy it owns the recording; a repeat call is a no-op.
        return capture.status === 'awaiting_upload' && !capture.media?.cleanPath
          ? capture.media
          : undefined;
      });
      // Starting is idempotent, so a retried or replayed request never transcribes twice. The demo
      // processes recordings as they arrive, so there is nothing left to start.
      if (media && this.mediaJobs) await this.mediaJobs.start({ objectPath: media.objectPath });
    }
    /** Work to start only after this request's own change commits. */
    const effects: { analysisStarted: boolean; removedMedia?: string[] } = {
      analysisStarted: false,
    };
    const response = await repository.transact((s) => {
      pruneExpired(s);
      evidence.compactScans(s);
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
        keptFrames,
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
    if (effects.removedMedia?.length && this.media) await this.removeMedia(effects.removedMedia);
    return response;
  }
  /**
   * Deletes a purged process's stored media after the deletion commits. Best effort: the records
   * are already gone, and draft storage expires on its own anyway.
   */
  private async removeMedia(objectPaths: string[]) {
    const media = this.media!;
    const failed = (
      await Promise.allSettled(objectPaths.map((objectPath) => media.remove(objectPath)))
    ).filter((x) => x.status === 'rejected').length;
    if (failed) console.warn(`Purged process left ${failed} stored media object(s) behind.`);
  }
  /**
   * Copies a draft's step images to storage that does not expire, before publishing commits.
   * Returns each draft image path mapped to its kept copy. Copying again on a retry is harmless.
   */
  private async keepFrames(repository: Repository, organizationId: string, id: string) {
    const { version, frames } = await repository.query((s) => {
      processes.requireDraft(processes.getProcess(s, id));
      return processes.mediaObjects(s, id);
    });
    if (!frames.length) return new Map<string, string>();
    const media = this.media;
    requireCondition(media, 'Media storage is not configured.', 503);
    const kept = await Promise.all(
      frames.map(async ({ stepId, objectPath }) => {
        const copy = mediaPaths.published(organizationId, id, version, stepId);
        await media.copy(objectPath, copy);
        return [objectPath, copy] as const;
      }),
    );
    return new Map(kept);
  }
  /** Signs read links outside the store query, which must not perform I/O. */
  private async mediaLinks(repository: Repository, id: string) {
    const media = this.media;
    requireCondition(media, 'Media storage is not configured.', 503);
    const { frames, video } = await repository.query((s) => processes.mediaObjects(s, id));
    const [frameLinks, videoLink] = await Promise.all([
      Promise.all(
        frames.map(async ({ stepId, objectPath }) => [
          stepId,
          await media.signRead(objectPath, 'image/jpeg'),
        ]),
      ),
      video && signedRecording(media, video),
    ]);
    const links: { frames: StepImageLinks; video?: Awaited<ReturnType<typeof signedRecording>> } = {
      frames: Object.fromEntries(frameLinks),
    };
    if (videoLink) links.video = videoLink;
    return links;
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
    actor: Actor,
  ): unknown {
    switch (operation) {
      case 'workspace':
        return {
          processes: processes.activeProcesses(s).slice(0, 50).map(processes.processDto),
          findings: s.findings.slice(0, 50),
          trials: s.trials.slice(0, 50),
          changes: s.changes.slice(0, 50),
          demo: actor.demo,
          organization: actor.organizationId,
          role: actor.role,
          hasMore: {
            processes: processes.activeProcesses(s).length > 50,
            findings: s.findings.length > 50,
            trials: s.trials.length > 50,
            changes: s.changes.length > 50,
          },
        };
      case 'processList':
        return page(processes.activeProcesses(s).map(processes.processDto), q);
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
        return evidence.findingDetailDto(s, id);
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
    effects: { analysisStarted: boolean; removedMedia?: string[] },
    extraction?: Awaited<ReturnType<GuardedCaptureAdapter['extract']>>,
    expected?: string,
    upload?: SignedUpload,
    keptFrames?: Map<string, string>,
  ): unknown {
    switch (operation) {
      case 'processCreate':
        return processes.processDto(
          processes.createProcess(s, parseInput(operation, input), ctx.actor),
        );
      case 'processUpdate':
        return processes.processDto(processes.updateProcess(s, id!, parseInput(operation, input)));
      case 'processDelete':
        return processes.deleteProcess(s, id!);
      case 'processPurge': {
        const { result, media } = processes.purgeProcess(s, id!, parseInput(operation, input));
        effects.removedMedia = media;
        return result;
      }
      case 'captureCreate': {
        const c = processes.createCapture(s, id!, parseInput(operation, input));
        return { id: c.id, processId: c.processId, kind: c.kind, createdAt: c.createdAt };
      }
      case 'uploadRequest': {
        const body = parseInput(operation, input);
        processes.createMediaCapture(s, id!, upload!, body, ctx.actor);
        return uploadTarget(upload!);
      }
      case 'frameRequest': {
        const body = parseInput(operation, input);
        const step = processes.getFrameStep(s, id!, body);
        step.frameAtMs = body.atMs;
        step.frameObjectPath = upload!.objectPath;
        return uploadTarget(upload!);
      }
      case 'uploadComplete':
        return processes.captureDraftDto(s, id);
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
        requireCondition(keptFrames, 'Step images were not prepared for publishing.', 500);
        return processes.processDto(
          processes.publishProcess(s, id!, parseInput(operation, input), ctx.actor, keptFrames),
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
        return evidence.explainFinding(s, id!, parseInput(operation, input));
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

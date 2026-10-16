import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AnalysisWorker } from '../application/analysis/worker';
import type { Backend } from '../application/backend';
import { authenticate, authorize, type TokenVerifier, type Actor } from './auth';
import { ApiError, safeError } from './errors';
import { LIMITS, type ServerConfig } from './config';
import { resolveEndpoint, querySchema } from './contracts';
import { AdmissionControl, readJson } from './limits';
import { Observability } from './observability';
import { withDeadline } from './deadline';
import { localRequestOrigin } from './origin';
import type { LocalMediaLibrary, LocalMediaUploads } from '../infrastructure/local-media';
import type { MediaWorker } from '../application/media-worker';
import type { MediaJob } from '../application/ports';
export interface HttpDependencies {
  backend: Backend;
  config: ServerConfig;
  verifier: TokenVerifier;
  admission?: AdmissionControl;
  observability?: Observability;
  /** Present when scans are analyzed through Cloud Tasks. */
  analysisTasks?: { worker: AnalysisWorker; verify: (request: Request) => Promise<boolean> };
  /** Present when uploaded recordings are processed through Cloud Tasks. */
  mediaTasks?: { worker: MediaWorker; verify: (request: Request) => Promise<boolean> };
  /** Loopback only: receives uploads addressed by locally signed URLs. */
  mediaUploads?: LocalMediaUploads;
  /** Serves signed media reads on the loopback server, where bucket URLs cannot be signed. */
  mediaFiles?: LocalMediaLibrary;
}
/**
 * Cloud Tasks retries a failed delivery (infra/tasks.tf `max_attempts`); the last attempt records
 * the failure on the scan or recording. Analysis and media share the queue, so they share this.
 */
export const TASK_MAX_ATTEMPTS = 3;
const jobSchema = z
  .object({ organizationId: z.string().min(1).max(128), scanId: z.string().uuid() })
  .strict();
const mediaJobSchema: z.ZodType<MediaJob> = z
  .object({ objectPath: z.string().min(1).max(512) })
  .strict();
export function createHttpHandler(dependencies: HttpDependencies) {
  const { backend, config, verifier } = dependencies;
  const admission = dependencies.admission ?? new AdmissionControl();
  const observability = dependencies.observability ?? new Observability();
  return async (request: Request, segments: string[]): Promise<Response> => {
    const requestId = randomUUID();
    const started = performance.now();
    let status = 500;
    let route = 'unknown';
    let actor: Actor | undefined;
    let code: string | undefined;
    let release: (() => void) | undefined;
    observability.begin();
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Request-ID': requestId,
      'X-API-Version': '1',
      'Referrer-Policy': 'no-referrer',
    });
    if (config.mode === 'production')
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    try {
      release = admission.enter();
      const url = new URL(request.url);
      const origin = request.headers.get('origin');
      const localOrigin =
        config.mode === 'demo' || config.emulator || config.local
          ? localRequestOrigin(request)
          : null;
      if (origin) {
        const allowed =
          config.allowedOrigins.includes(origin) ||
          (localOrigin !== null && origin === localOrigin);
        if (!allowed) throw new ApiError(403, 'Origin is not allowed.');
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
      }
      if (request.headers.get('sec-fetch-site') === 'cross-site' && !origin)
        throw new ApiError(403, 'Cross-site requests require an allowed origin.');
      if (request.method === 'OPTIONS') {
        resolveEndpoint(request.headers.get('access-control-request-method') ?? 'GET', segments);
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
        headers.set('Access-Control-Max-Age', '600');
        status = 204;
        return new Response(null, { status, headers });
      }
      admission.rate('global', LIMITS.requestsPerMinute * 10);
      const path = segments[0] === 'v1' ? segments.slice(1) : segments;
      if (
        path.length === 2 &&
        path[0] === 'health' &&
        ['live', 'ready'].includes(path[1]) &&
        request.method === 'GET'
      ) {
        route = `health/${path[1]}`;
        if (path[1] === 'ready') {
          if (!admission.isAccepting) throw new ApiError(503, 'Service is draining.');
          await withDeadline(
            backend.repositories
              .forTenant(config.mode === 'demo' ? 'demo-org' : 'healthcheck')
              .health(),
            5000,
          );
        }
        status = 200;
        return new Response(JSON.stringify({ status: 'ok' }), { status, headers });
      }
      if (path.join('/') === 'internal/analysis' && request.method === 'POST') {
        route = 'internal/analysis';
        const tasks = dependencies.analysisTasks;
        if (!tasks || !(await tasks.verify(request))) throw new ApiError(403, 'Forbidden.');
        const job = jobSchema.safeParse(await readJson(request));
        if (!job.success) throw new ApiError(400, 'Invalid analysis job.');
        const retries = Number(request.headers.get('x-cloudtasks-taskretrycount') ?? 0);
        await tasks.worker.process(job.data, retries + 1 >= TASK_MAX_ATTEMPTS);
        status = 204;
        return new Response(null, { status, headers });
      }
      if (path.join('/') === 'internal/media' && request.method === 'POST') {
        route = 'internal/media';
        const tasks = dependencies.mediaTasks;
        if (!tasks || !(await tasks.verify(request))) throw new ApiError(403, 'Forbidden.');
        const job = mediaJobSchema.safeParse(await readJson(request));
        if (!job.success) throw new ApiError(400, 'Invalid media job.');
        const retries = Number(request.headers.get('x-cloudtasks-taskretrycount') ?? 0);
        await tasks.worker.process(job.data, retries + 1 >= TASK_MAX_ATTEMPTS);
        status = 204;
        return new Response(null, { status, headers });
      }
      if (path.join('/') === 'internal/media-upload' && request.method === 'PUT') {
        route = 'internal/media-upload';
        // The signed grant authorizes the write, as a Cloud Storage signed URL would.
        if (!dependencies.mediaUploads || !localOrigin)
          throw new ApiError(404, 'Endpoint not found.');
        await dependencies.mediaUploads.receive(request);
        status = 204;
        return new Response(null, { status, headers });
      }
      if (path.join('/') === 'internal/media-file' && request.method === 'GET') {
        route = 'internal/media-file';
        // The signed grant authorizes the read, as a Cloud Storage signed URL would.
        if (!dependencies.mediaFiles || !localOrigin)
          throw new ApiError(404, 'Endpoint not found.');
        const file = await dependencies.mediaFiles.serve(request);
        status = file.status;
        headers.set('Content-Type', file.contentType);
        headers.set('Accept-Ranges', 'bytes');
        if (file.contentRange) headers.set('Content-Range', file.contentRange);
        return new Response(Buffer.from(file.bytes), { status, headers });
      }
      actor = await authenticate(request, config, verifier);
      admission.rate(`actor:${actor.organizationId}:${actor.userId}`);
      if (path.length === 1 && path[0] === 'metrics' && request.method === 'GET') {
        authorize(actor, 'admin', config);
        route = 'metrics';
        status = 200;
        return new Response(JSON.stringify(observability.snapshot()), { status, headers });
      }
      const resolved = resolveEndpoint(request.method, segments);
      route = resolved.endpoint.path;
      // Permission checks precede body reads and any service or provider work.
      authorize(actor, resolved.endpoint.permission, config);
      const params = Object.fromEntries(url.searchParams);
      if ([...url.searchParams.keys()].length !== Object.keys(params).length)
        throw new ApiError(400, 'Duplicate query parameters are not accepted.');
      const parsedQuery = querySchema.safeParse(params);
      if (!parsedQuery.success)
        throw new ApiError(400, 'Invalid pagination, filtering or sorting parameters.');
      const body = request.method === 'POST' ? await readJson(request) : {};
      const execution = backend.execute(
        resolved.endpoint,
        resolved.id,
        body,
        { actor, requestId, idempotencyKey: request.headers.get('idempotency-key') ?? undefined },
        parsedQuery.data,
      );
      // Keep an admission slot until the underlying operation settles, including unknown-commit timeouts.
      const releaseExecution = release;
      release = undefined;
      execution.then(
        () => releaseExecution?.(),
        () => releaseExecution?.(),
      );
      const result = await withDeadline(
        execution,
        resolved.endpoint.operation === 'captureAnalyze'
          ? LIMITS.aiTimeoutMs + LIMITS.requestTimeoutMs
          : LIMITS.requestTimeoutMs,
      );
      const serialized = JSON.stringify(result);
      if (Buffer.byteLength(serialized) > LIMITS.responseBytes)
        throw new ApiError(413, 'Response is too large. Use the paginated collection endpoints.');
      status = resolved.endpoint.create ? 201 : 200;
      return new Response(serialized, { status, headers });
    } catch (error) {
      const safe = safeError(error, requestId);
      status = safe.status;
      code = safe.body.code;
      if (safe.retryAfter) headers.set('Retry-After', String(safe.retryAfter));
      return new Response(JSON.stringify(safe.body), { status, headers });
    } finally {
      release?.();
      observability.finish({
        requestId,
        route,
        method: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
          ? request.method
          : 'OTHER',
        status,
        durationMs: Math.round(performance.now() - started),
        actorId: actor?.userId,
        organizationId: actor?.organizationId,
        code,
      });
    }
  };
}

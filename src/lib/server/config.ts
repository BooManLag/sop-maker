import path from 'node:path';
import { z } from 'zod';
import { maxMediaBytes } from '../domain/types';
const flag = z.enum(['true', 'false']);
const environment = z.object({
  GOOD_EXCEPTION_MODE: z.enum(['demo', 'production']).default('demo'),
  GOOD_EXCEPTION_DATA_DIR: z.string().optional(),
  GOOD_EXCEPTION_ALLOWED_ORIGINS: z.string().default(''),
  GOOD_EXCEPTION_PSEUDONYM_KEY: z.string().min(32).optional(),
  GOOD_EXCEPTION_REQUIRE_MFA: flag.default('false'),
  GOOD_EXCEPTION_OPEN_ORGANIZATION: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,128}$/)
    .optional(),
  GOOD_EXCEPTION_OPEN_ROLE: z.enum(['viewer', 'expert', 'reviewer', 'admin']).default('reviewer'),
  GOOGLE_CLOUD_PROJECT: z
    .string()
    .regex(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/)
    .optional(),
  FIRESTORE_DATABASE_ID: z.string().default('(default)'),
  GOOD_EXCEPTION_GEMINI_MODEL: z
    .string()
    .regex(/^[a-z0-9.-]{3,64}$/)
    .optional(),
  GOOD_EXCEPTION_AGENT_MODEL: z
    .string()
    .regex(/^[a-z0-9.-]{3,64}$/)
    .optional(),
  GOOD_EXCEPTION_EMBEDDING_MODEL: z
    .string()
    .regex(/^[a-z0-9.-]{3,64}$/)
    .default('gemini-embedding-001'),
  GOOD_EXCEPTION_TASKS_QUEUE: z
    .string()
    .regex(/^projects\/[a-z0-9-]+\/locations\/[a-z0-9-]+\/queues\/[A-Za-z0-9-]+$/)
    .optional(),
  GOOD_EXCEPTION_WORKER_URL: z.string().url().startsWith('https://').optional(),
  GOOD_EXCEPTION_TASKS_INVOKER: z.string().email().optional(),
  GOOGLE_CLOUD_LOCATION: z
    .string()
    .regex(/^[a-z0-9-]{2,32}$/)
    .default('global'),
  K_SERVICE: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  /** Local development against the live project: allows the loopback origin. */
  GOOD_EXCEPTION_LOCAL: flag.default('false'),
  /** Cloud Storage bucket for recordings and frames; unset = media uploads are unavailable. */
  GOOD_EXCEPTION_MEDIA_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/)
    .optional(),
});
export interface ServerConfig {
  mode: 'demo' | 'production';
  dataDir: string;
  allowedOrigins: string[];
  projectId?: string;
  databaseId: string;
  gemini?: { model: string; agentModel: string; embeddingModel: string; location: string };
  tasks?: { queue: string; workerUrl: string; invokerEmail: string };
  pseudonymKey?: string;
  requireMfa: boolean;
  /** Signed-in users without membership claims join this organization with this role. */
  openMembership?: { organizationId: string; role: 'viewer' | 'expert' | 'reviewer' | 'admin' };
  emulator: boolean;
  /** Running on a developer machine against the live project. */
  local?: boolean;
  mediaBucket?: string;
}
export function readConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = environment.safeParse(env);
  if (!parsed.success)
    throw new Error(
      'Invalid backend configuration. Check documented environment variable names and formats.',
    );
  const e = parsed.data;
  const local = e.GOOD_EXCEPTION_LOCAL === 'true';
  const origins = e.GOOD_EXCEPTION_ALLOWED_ORIGINS.split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('Allowed origins must be exact HTTPS origins.');
    }
    if (url.origin !== origin || url.protocol !== 'https:')
      throw new Error('Allowed origins must be exact HTTPS origins.');
  }
  if (Boolean(e.FIRESTORE_EMULATOR_HOST) !== Boolean(e.FIREBASE_AUTH_EMULATOR_HOST))
    throw new Error('Auth and Firestore emulators must be configured together.');
  if (e.K_SERVICE && e.GOOD_EXCEPTION_MODE !== 'production')
    throw new Error('Cloud Run requires production mode. The local demo cannot be deployed.');
  if (
    e.GOOD_EXCEPTION_MODE === 'production' &&
    (!e.GOOGLE_CLOUD_PROJECT ||
      !e.GOOD_EXCEPTION_PSEUDONYM_KEY ||
      // Against the local emulators the app is served from loopback, which is always allowed.
      (!origins.length && !e.FIRESTORE_EMULATOR_HOST && !local))
  )
    throw new Error(
      'Production requires GOOGLE_CLOUD_PROJECT, GOOD_EXCEPTION_PSEUDONYM_KEY and GOOD_EXCEPTION_ALLOWED_ORIGINS.',
    );
  if (e.K_SERVICE && local) throw new Error('Local development mode is forbidden on Cloud Run.');
  if (e.K_SERVICE && (e.FIRESTORE_EMULATOR_HOST || e.FIREBASE_AUTH_EMULATOR_HOST))
    throw new Error('Emulator connections are forbidden on Cloud Run.');
  const taskFields = [
    e.GOOD_EXCEPTION_TASKS_QUEUE,
    e.GOOD_EXCEPTION_WORKER_URL,
    e.GOOD_EXCEPTION_TASKS_INVOKER,
  ];
  if (taskFields.some(Boolean) && !taskFields.every(Boolean))
    throw new Error('Cloud Tasks queue, worker URL and invoker must be configured together.');
  if (e.K_SERVICE && e.GOOD_EXCEPTION_GEMINI_MODEL && !taskFields.every(Boolean))
    throw new Error('Cloud Run AI analysis requires durable Cloud Tasks configuration.');
  if (e.FIRESTORE_EMULATOR_HOST && e.GOOD_EXCEPTION_GEMINI_MODEL)
    throw new Error('Live AI models are forbidden during emulator validation.');
  if (e.GOOD_EXCEPTION_WORKER_URL) {
    const worker = new URL(e.GOOD_EXCEPTION_WORKER_URL);
    if (
      worker.username ||
      worker.password ||
      worker.search ||
      worker.hash ||
      worker.pathname !== '/api/v1/internal/analysis'
    )
      throw new Error('Worker URL must name the exact HTTPS analysis endpoint.');
  }
  return {
    mode: e.GOOD_EXCEPTION_MODE,
    dataDir: e.GOOD_EXCEPTION_DATA_DIR ?? path.join(process.cwd(), '.demo-data'),
    allowedOrigins: origins,
    projectId: e.GOOGLE_CLOUD_PROJECT,
    databaseId: e.FIRESTORE_DATABASE_ID,
    gemini: e.GOOD_EXCEPTION_GEMINI_MODEL
      ? {
          model: e.GOOD_EXCEPTION_GEMINI_MODEL,
          agentModel: e.GOOD_EXCEPTION_AGENT_MODEL ?? e.GOOD_EXCEPTION_GEMINI_MODEL,
          embeddingModel: e.GOOD_EXCEPTION_EMBEDDING_MODEL,
          location: e.GOOGLE_CLOUD_LOCATION,
        }
      : undefined,
    tasks:
      e.GOOD_EXCEPTION_TASKS_QUEUE && e.GOOD_EXCEPTION_WORKER_URL && e.GOOD_EXCEPTION_TASKS_INVOKER
        ? {
            queue: e.GOOD_EXCEPTION_TASKS_QUEUE,
            workerUrl: e.GOOD_EXCEPTION_WORKER_URL,
            invokerEmail: e.GOOD_EXCEPTION_TASKS_INVOKER,
          }
        : undefined,
    pseudonymKey: e.GOOD_EXCEPTION_PSEUDONYM_KEY,
    requireMfa: e.GOOD_EXCEPTION_REQUIRE_MFA === 'true',
    openMembership: e.GOOD_EXCEPTION_OPEN_ORGANIZATION
      ? { organizationId: e.GOOD_EXCEPTION_OPEN_ORGANIZATION, role: e.GOOD_EXCEPTION_OPEN_ROLE }
      : undefined,
    emulator: Boolean(e.FIRESTORE_EMULATOR_HOST),
    local,
    mediaBucket: e.GOOD_EXCEPTION_MEDIA_BUCKET,
  };
}
export const LIMITS = Object.freeze({
  bodyBytes: 1_000_000,
  bodyDepth: 12,
  bodyNodes: 25_000,
  bodyTimeoutMs: 5000,
  rows: 1000,
  steps: 100,
  captureCharacters: 20_000,
  mediaBytes: maxMediaBytes,
  /** Not a product cap: the longest recording Gemini can transcribe in one request. */
  mediaSecondsCeiling: 45 * 60,
  frameBytes: 500_000,
  mediaSecondsPerMonth: 300 * 60,
  responseBytes: 800_000,
  stateBytes: 750_000,
  recordsPerTenant: 500,
  auditRecords: 1000,
  idempotencyRecords: 1000,
  requestsPerMinute: 120,
  mutationsPerMinute: 40,
  activeRequests: 32,
  waitingRequests: 64,
  requestTimeoutMs: 15_000,
  aiTimeoutMs: 30_000,
  aiOutputTokens: 2048,
  aiCallsPerHour: 20,
});

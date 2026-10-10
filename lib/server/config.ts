import path from 'node:path';
import { z } from 'zod';
const flag = z.enum(['true', 'false']);
const environment = z.object({
  GOOD_EXCEPTION_MODE: z.enum(['demo', 'production']).default('demo'),
  GOOD_EXCEPTION_DATA_DIR: z.string().optional(),
  GOOD_EXCEPTION_ALLOWED_ORIGINS: z.string().default(''),
  GOOD_EXCEPTION_PSEUDONYM_KEY: z.string().min(32).optional(),
  GOOD_EXCEPTION_REQUIRE_MFA: flag.default('true'),
  GOOGLE_CLOUD_PROJECT: z
    .string()
    .regex(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/)
    .optional(),
  FIRESTORE_DATABASE_ID: z.string().default('(default)'),
  K_SERVICE: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
});
export interface ServerConfig {
  mode: 'demo' | 'production';
  dataDir: string;
  allowedOrigins: string[];
  projectId?: string;
  databaseId: string;
  pseudonymKey?: string;
  requireMfa: boolean;
  emulator: boolean;
}
export function readConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = environment.safeParse(env);
  if (!parsed.success)
    throw new Error(
      'Invalid backend configuration. Check documented environment variable names and formats.',
    );
  const e = parsed.data;
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
    (!e.GOOGLE_CLOUD_PROJECT || !e.GOOD_EXCEPTION_PSEUDONYM_KEY || !origins.length)
  )
    throw new Error(
      'Production requires GOOGLE_CLOUD_PROJECT, GOOD_EXCEPTION_PSEUDONYM_KEY and GOOD_EXCEPTION_ALLOWED_ORIGINS.',
    );
  if (e.K_SERVICE && (e.FIRESTORE_EMULATOR_HOST || e.FIREBASE_AUTH_EMULATOR_HOST))
    throw new Error('Emulator connections are forbidden on Cloud Run.');
  return {
    mode: e.GOOD_EXCEPTION_MODE,
    dataDir: e.GOOD_EXCEPTION_DATA_DIR ?? path.join(process.cwd(), '.demo-data'),
    allowedOrigins: origins,
    projectId: e.GOOGLE_CLOUD_PROJECT,
    databaseId: e.FIRESTORE_DATABASE_ID,
    pseudonymKey: e.GOOD_EXCEPTION_PSEUDONYM_KEY,
    requireMfa: e.GOOD_EXCEPTION_REQUIRE_MFA === 'true',
    emulator: Boolean(e.FIRESTORE_EMULATOR_HOST),
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
  aiTimeoutMs: 5000,
  aiOutputTokens: 2048,
  aiCallsPerHour: 20,
});

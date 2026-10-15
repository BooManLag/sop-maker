import type { Store } from './store';
import type {
  Execution,
  MediaContentType,
  ProcessStep,
  Readiness,
  SuggestedStep,
  TranscriptSegment,
} from '../domain/types';
export type ReadOperation<T> = (store: Store) => T;
export interface Repository {
  read(): Promise<Store>;
  query<T>(fn: ReadOperation<T>): Promise<T>;
  transact<T>(fn: ReadOperation<T>): Promise<T>;
  health(): Promise<void>;
}
export interface RepositoryProvider {
  forTenant(organizationId: string): Repository;
}
export interface CaptureAdapter {
  extract(
    text: string,
    sample: boolean,
    options?: { signal: AbortSignal; maxOutputTokens: number },
  ): Promise<ProcessStep[]>;
  questions(steps: ProcessStep[]): Promise<string[]>;
}
export interface UploadSigner {
  sign(request: {
    objectPath: string;
    contentType: string;
    maxBytes: number;
  }): Promise<{ url: string }>;
}
export interface MediaStorage {
  read(objectPath: string): Promise<Uint8Array>;
  /** Moves an inspected object out of quarantine. Idempotent: a finished move is a no-op. */
  promote(from: string, to: string): Promise<void>;
  remove(objectPath: string): Promise<void>;
}
export interface Transcription {
  segments: TranscriptSegment[];
  steps: SuggestedStep[];
  /** Audio length the model was billed for. */
  audioSeconds: number;
}
export interface MediaTranscriber {
  transcribe(
    objectPath: string,
    contentType: MediaContentType,
    /** `durationSeconds` is the inspected recording length that segment times must fit. */
    options?: { signal?: AbortSignal; durationSeconds?: number },
  ): Promise<Transcription>;
}
export interface AnalyticsService {
  readiness(records: Execution[]): Readiness;
  analyze(records: Execution[]): Promise<never>;
}

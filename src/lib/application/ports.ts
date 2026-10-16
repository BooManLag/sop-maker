import type { Store } from './store';
import type { ByteSource } from './media-inspector';
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
  /** Ranged access to a stored object; never loads it whole. */
  open(objectPath: string): Promise<ByteSource>;
  /** Hex SHA-256 of a stored object, computed by streaming it. */
  sha256(objectPath: string): Promise<string>;
  /** Moves an inspected object out of quarantine. Idempotent: a finished move is a no-op. */
  promote(from: string, to: string): Promise<void>;
  remove(objectPath: string): Promise<void>;
  exists(objectPath: string): Promise<boolean>;
}
/** Stored media the app's own pages display, and the copies publishing keeps. */
export interface MediaLibrary {
  /** A short-lived link the browser can read the object from. */
  signRead(objectPath: string, contentType: string): Promise<string>;
  copy(from: string, to: string): Promise<void>;
  /** Deletes an object; a missing one is not an error. */
  remove(objectPath: string): Promise<void>;
}
/** One uploaded recording to inspect and transcribe. */
export interface MediaJob {
  /** Object written through a signed upload URL (see `mediaPaths.recording`). */
  objectPath: string;
}
/** Starts processing an uploaded recording, off the request path where storage allows. */
export interface MediaJobs {
  /** Safe to repeat for the same recording: a started job is never started twice. */
  start(job: MediaJob): Promise<void>;
}
/** Storage the loopback upload receiver can write into. */
export interface WritableMediaStorage extends MediaStorage {
  write(objectPath: string, bytes: Uint8Array): Promise<void>;
  copy(from: string, to: string): Promise<void>;
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
    /** `durationSeconds` is the measured recording length that segment times must fit. */
    options?: { signal?: AbortSignal; durationSeconds?: number },
  ): Promise<Transcription>;
}
export interface AnalyticsService {
  readiness(records: Execution[]): Readiness;
  analyze(records: Execution[]): Promise<never>;
}

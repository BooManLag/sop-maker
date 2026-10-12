import type { Store } from './store';
import type { Execution, ProcessStep, Readiness } from '../domain/types';
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
export interface AnalyticsService {
  readiness(records: Execution[]): Readiness;
  analyze(records: Execution[]): Promise<never>;
}

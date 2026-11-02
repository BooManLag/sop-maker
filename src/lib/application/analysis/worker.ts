import type { RepositoryProvider } from '../ports';
import * as evidence from '../evidence-service';
import { AnalysisToolkit, clusterSignals, type NoteGrouper } from './toolkit';

export interface AnalysisJob {
  organizationId: string;
  scanId: string;
}
export interface AnalysisQueue {
  enqueue(job: AnalysisJob): Promise<void>;
}
export type Driver = (toolkit: AnalysisToolkit, signal: AbortSignal) => Promise<void>;

export const ANALYSIS_TIMEOUT_MS = 240_000;

/**
 * Runs one scan analysis. Safe to repeat: a scan that is no longer analyzing is left alone,
 * so queue redelivery never duplicates findings.
 */
export class AnalysisWorker {
  constructor(
    private repositories: RepositoryProvider,
    private grouper: NoteGrouper,
    private driver: Driver,
    private log: (entry: Record<string, unknown>) => void = (e) => console.log(JSON.stringify(e)),
    private method: evidence.AnalysisMethod = evidence.GEMINI_ANALYSIS,
  ) {}
  async process(job: AnalysisJob, finalAttempt: boolean) {
    const repository = this.repositories.forTenant(job.organizationId);
    const input = await repository.query((s) => evidence.analysisInput(s, job.scanId));
    if (!input) return;
    const started = performance.now();
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), ANALYSIS_TIMEOUT_MS);
    try {
      const clusters = await clusterSignals(input.records, this.grouper, abort.signal);
      const toolkit = new AnalysisToolkit(input.records, input.steps, clusters);
      if (clusters.length) await this.driver(toolkit, abort.signal);
      const outcome = { findings: toolkit.proposals, funnel: toolkit.funnel() };
      await repository.transact((s) =>
        evidence.completeAnalysis(s, job.scanId, outcome, input.sopVersion, this.method),
      );
      this.log({
        severity: 'INFO',
        event: 'scan_analysis_complete',
        scanId: job.scanId,
        durationMs: Math.round(performance.now() - started),
        clusters: clusters.length,
        findings: outcome.findings.length,
      });
    } catch (error) {
      this.log({
        severity: finalAttempt ? 'ERROR' : 'WARNING',
        event: 'scan_analysis_failed',
        scanId: job.scanId,
        finalAttempt,
        error: error instanceof Error ? error.name : 'unknown',
      });
      if (finalAttempt) await repository.transact((s) => evidence.failAnalysis(s, job.scanId));
      else throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Local and emulator runs: analyze in-process after the request returns. */
export class InlineAnalysisQueue implements AnalysisQueue {
  constructor(private worker: AnalysisWorker) {}
  async enqueue(job: AnalysisJob) {
    setImmediate(() => void this.worker.process(job, true).catch(() => undefined));
  }
}

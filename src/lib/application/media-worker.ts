import { randomUUID } from 'node:crypto';
import type { ExpertCapture } from '../domain/types';
import type {
  MediaJob,
  MediaStorage,
  MediaTranscriber,
  Repository,
  RepositoryProvider,
  Transcription,
} from './ports';
import { inspectMedia } from './media-inspector';
import { mediaPaths } from './media-paths';
import * as processes from './process-service';
import { adjustMediaSeconds, reserveMediaSeconds } from './store';
import { ApiError } from '../server/errors';
import { transcriptionSchema } from '../server/contracts';
import { LIMITS } from '../server/config';

type Recording = ExpertCapture & { media: NonNullable<ExpertCapture['media']> };
const chargedSeconds = (seconds = 0) => Math.ceil(seconds);

/**
 * Turns one uploaded recording into a draft. Safe to repeat: a capture that is no longer
 * awaiting its upload is left alone, and every storage step tolerates having already run,
 * so storage-event redelivery never transcribes twice or strands a half-moved file.
 */
export class MediaWorker {
  constructor(
    private repositories: RepositoryProvider,
    private storage: MediaStorage,
    private transcriber: MediaTranscriber,
    private log: (entry: Record<string, unknown>) => void = (e) => console.log(JSON.stringify(e)),
  ) {}
  async process(job: MediaJob, finalAttempt: boolean) {
    const organizationId = mediaPaths.owner(job.objectPath);
    if (!organizationId) return;
    const repository = this.repositories.forTenant(organizationId);
    const recording = await this.pendingRecording(repository, job.objectPath);
    if (!recording) return;
    const admitted = recording.media.cleanPath
      ? recording
      : await this.admit(repository, recording);
    if (!admitted) return;
    await this.storage.promote(admitted.media.objectPath, admitted.media.cleanPath!);
    const result = await this.transcribe(repository, admitted);
    if (result.transcription) await this.applyDraft(repository, admitted, result);
    else await this.fail(repository, admitted, finalAttempt, result.issues ?? []);
  }
  private pendingRecording(repository: Repository, objectPath: string) {
    return repository.query(
      (s) =>
        s.captures.find(
          (c) => c.media?.objectPath === objectPath && c.status === 'awaiting_upload',
        ) as Recording | undefined,
    );
  }
  /** Inspects and charges the quarantined recording; returns it measured, or undefined once rejected. */
  private async admit(repository: Repository, recording: Recording) {
    const { objectPath, contentType } = recording.media;
    const inspection = await inspectMedia(await this.storage.open(objectPath), contentType);
    if (!inspection.ok) return this.reject(repository, recording, inspection.reason);
    const { seconds } = inspection;
    if (seconds > LIMITS.mediaSecondsCeiling)
      return this.reject(repository, recording, 'The recording is too long to process.');
    const sha256 = await this.storage.sha256(objectPath);
    const media = { ...recording.media, seconds, sha256, cleanPath: mediaPaths.clean(objectPath) };
    try {
      // Recorded before the move, so a crash after it still finds the clean copy on retry.
      await repository.transact((s) => {
        reserveMediaSeconds(s, chargedSeconds(seconds));
        processes.getCapture(s, recording.id).media = media;
      });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 429)) throw error;
      return this.reject(repository, recording, 'The monthly recording allowance is used up.');
    }
    return { ...recording, media };
  }
  private async reject(repository: Repository, recording: Recording, reason: string) {
    await this.storage.remove(recording.media.objectPath);
    await repository.transact((s) => {
      const capture = processes.getCapture(s, recording.id);
      capture.status = 'rejected';
      capture.rejection = reason;
    });
    this.log({ severity: 'WARNING', event: 'media_rejected', captureId: recording.id, reason });
    return undefined;
  }
  /** A validated transcription, reusing an identical recording's when one exists. */
  private async transcribe(repository: Repository, recording: Recording) {
    const { cleanPath, contentType, seconds, sha256 } = recording.media;
    const earlier = await repository.query((s) => {
      return sha256
        ? s.captures.find(
            (c) =>
              c.id !== recording.id &&
              c.status === 'transcribed' &&
              c.media?.sha256 === sha256 &&
              (!c.expiresAt || Date.parse(c.expiresAt) > Date.now()),
          )
        : undefined;
    });
    const candidate = earlier
      ? { segments: earlier.segments, steps: earlier.suggestedSteps, audioSeconds: 0 }
      : await this.transcriber
          .transcribe(cleanPath!, contentType, { durationSeconds: seconds })
          .catch(() => undefined);
    const recordingMs = processes.recordingLengthMs(recording);
    const parsed = transcriptionSchema(recordingMs).safeParse(
      fitToRecording(candidate, recordingMs),
    );
    if (parsed.success) return { transcription: parsed.data, reused: !!earlier };
    return {
      issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  private async fail(
    repository: Repository,
    recording: Recording,
    finalAttempt: boolean,
    issues: string[],
  ) {
    this.log({
      severity: finalAttempt ? 'ERROR' : 'WARNING',
      event: 'media_transcription_invalid',
      captureId: recording.id,
      finalAttempt,
      issues,
    });
    if (!finalAttempt) throw new Error('The transcription was invalid. Nothing was saved.');
    await repository.transact((s) => {
      processes.getCapture(s, recording.id).status = 'failed';
    });
  }
  /**
   * Saves the transcript; seeds draft steps only when the expert has none yet. The charge stays
   * the length read from the file, refunded when an identical recording's transcript was reused.
   */
  private async applyDraft(
    repository: Repository,
    recording: Recording,
    { transcription, reused }: { transcription: Transcription; reused: boolean },
  ) {
    await repository.transact((s) => {
      const capture = processes.getCapture(s, recording.id);
      const draft = processes.getProcess(s, capture.processId);
      processes.requireDraft(draft);
      capture.segments = transcription.segments;
      capture.suggestedSteps = transcription.steps;
      capture.status = 'transcribed';
      if (reused) adjustMediaSeconds(s, -chargedSeconds(recording.media.seconds));
      const version = draft.versions[0];
      if (!version.steps.length) version.steps = transcription.steps.map(toDraftStep);
    });
    this.log({ severity: 'INFO', event: 'media_transcribed', captureId: recording.id });
  }
}
/**
 * Pulls model times inside the recording and trims overlaps, which models make routinely.
 * Anything not shaped like a transcription is passed through for the schema to reject.
 */
function fitToRecording(candidate: unknown, recordingMs: number): unknown {
  const c = candidate as Partial<Transcription> | undefined;
  if (!Array.isArray(c?.segments) || !Array.isArray(c?.steps)) return candidate;
  const fit = (ms: unknown) =>
    typeof ms === 'number' ? Math.min(Math.max(Math.round(ms), 0), recordingMs) : ms;
  let previousEnd = 0;
  const segments = [...c.segments]
    .sort((a, b) => Number(a?.startMs) - Number(b?.startMs))
    .map((segment) => {
      const startMs = Math.max(Number(fit(segment.startMs)), previousEnd);
      const endMs = Math.max(Number(fit(segment.endMs)), startMs);
      previousEnd = endMs;
      return { ...segment, startMs, endMs };
    });
  const steps = c.steps.map((step) => ({ ...step, frameAtMs: fit(step.frameAtMs) as number }));
  return { ...c, segments, steps };
}
const toDraftStep = (step: Transcription['steps'][number], i: number) => ({
  id: randomUUID(),
  sequence: i + 1,
  action: step.action,
  required: true,
  source: 'expert_walkthrough' as const,
  frameAtMs: step.frameAtMs,
});

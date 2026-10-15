import { createHash, randomUUID } from 'node:crypto';
import type { ExpertCapture } from '../domain/types';
import type {
  MediaStorage,
  MediaTranscriber,
  Repository,
  RepositoryProvider,
  Transcription,
} from './ports';
import { inspectMedia } from './media-inspector';
import { mediaPaths } from './media-paths';
import * as processes from './process-service';
import { adjustMediaSeconds } from './store';
import { transcriptionSchema } from '../server/contracts';
import { LIMITS } from '../server/config';

export interface MediaJob {
  /** Object written through a signed upload URL (see `mediaPaths.recording`). */
  objectPath: string;
}
type Recording = ExpertCapture & { media: NonNullable<ExpertCapture['media']> };
const reservedSeconds = (recording: Recording) => Math.ceil(recording.media.declaredSeconds);

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
    const clean = recording.media.cleanPath ?? (await this.admit(repository, recording));
    if (!clean) return;
    await this.storage.promote(recording.media.objectPath, clean);
    const transcription = await this.transcribe(repository, recording, clean);
    if (transcription) await this.applyDraft(repository, recording, transcription);
    else await this.fail(repository, recording, finalAttempt);
  }
  private pendingRecording(repository: Repository, objectPath: string) {
    return repository.query(
      (s) =>
        s.captures.find(
          (c) => c.media?.objectPath === objectPath && c.status === 'awaiting_upload',
        ) as Recording | undefined,
    );
  }
  /** Inspects the quarantined bytes; returns the clean path, or undefined once rejected. */
  private async admit(repository: Repository, recording: Recording) {
    const { objectPath, contentType, declaredSeconds } = recording.media;
    const bytes = await this.storage.read(objectPath);
    const inspection = inspectMedia(bytes, contentType, declaredSeconds);
    if (!inspection.ok) {
      await this.storage.remove(objectPath);
      await repository.transact((s) => {
        processes.getCapture(s, recording.id).status = 'rejected';
        adjustMediaSeconds(s, -reservedSeconds(recording));
      });
      this.log({
        severity: 'WARNING',
        event: 'media_rejected',
        captureId: recording.id,
        reason: inspection.reason,
      });
      return undefined;
    }
    const clean = mediaPaths.clean(objectPath);
    // Recorded before the move, so a crash after it still finds the clean copy on retry.
    await repository.transact((s) => {
      const media = processes.getCapture(s, recording.id).media!;
      media.cleanPath = clean;
      media.sha256 = createHash('sha256').update(bytes).digest('hex');
    });
    return clean;
  }
  /** A validated transcription, reusing an identical recording's when one exists. */
  private async transcribe(repository: Repository, recording: Recording, clean: string) {
    const earlier = await repository.query((s) => {
      const sha256 = processes.getCapture(s, recording.id).media?.sha256;
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
          .transcribe(clean, recording.media.contentType, {
            durationSeconds: recording.media.declaredSeconds,
          })
          .catch(() => undefined);
    const recordingMs = Math.ceil(recording.media.declaredSeconds * 1000);
    const parsed = transcriptionSchema(recordingMs).safeParse(candidate);
    return parsed.success ? parsed.data : undefined;
  }
  private async fail(repository: Repository, recording: Recording, finalAttempt: boolean) {
    this.log({
      severity: finalAttempt ? 'ERROR' : 'WARNING',
      event: 'media_transcription_invalid',
      captureId: recording.id,
      finalAttempt,
    });
    if (!finalAttempt) throw new Error('The transcription was invalid. Nothing was saved.');
    await repository.transact((s) => {
      processes.getCapture(s, recording.id).status = 'failed';
    });
  }
  /** Saves the transcript; seeds draft steps only when the expert has none yet. */
  private async applyDraft(
    repository: Repository,
    recording: Recording,
    transcription: Transcription,
  ) {
    await repository.transact((s) => {
      const capture = processes.getCapture(s, recording.id);
      const draft = processes.getProcess(s, capture.processId);
      processes.requireDraft(draft);
      capture.segments = transcription.segments;
      capture.suggestedSteps = transcription.steps;
      capture.status = 'transcribed';
      const billedSeconds = Math.min(Math.ceil(transcription.audioSeconds), LIMITS.mediaSeconds);
      adjustMediaSeconds(s, billedSeconds - reservedSeconds(recording));
      const version = draft.versions[0];
      if (!version.steps.length) version.steps = transcription.steps.map(toDraftStep);
    });
    this.log({ severity: 'INFO', event: 'media_transcribed', captureId: recording.id });
  }
}
const toDraftStep = (step: Transcription['steps'][number], i: number) => ({
  id: randomUUID(),
  sequence: i + 1,
  action: step.action,
  required: true,
  source: 'expert_walkthrough' as const,
  frameAtMs: step.frameAtMs,
});

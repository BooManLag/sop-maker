import type { MediaJob, MediaJobs, MediaStorage } from '../application/ports';
import type { MediaWorker } from '../application/media-worker';
import { ApiError } from './errors';
import type { TaskQueue } from './cloud-tasks';

/** The browser says an upload finished; storage, not the browser, decides whether it did. */
async function requireUploaded(storage: MediaStorage, objectPath: string) {
  if (!(await storage.exists(objectPath)))
    throw new ApiError(409, 'The recording has not finished uploading. Try again.');
}
/** Cloud Tasks names allow letters, digits, hyphens and underscores; upload ids are UUIDs. */
const taskIdFor = (job: MediaJob) => `media-${job.objectPath.split('/').at(-1)}`;

/** Production: transcription runs as a Cloud Task, beyond the request's lifetime. */
export class QueuedMediaJobs implements MediaJobs {
  constructor(
    private storage: MediaStorage,
    private queue: TaskQueue,
    private workerUrl: string,
  ) {}
  async start(job: MediaJob) {
    await requireUploaded(this.storage, job.objectPath);
    await this.queue.post(this.workerUrl, job, taskIdFor(job));
  }
}

/** Without Cloud Tasks (local development): transcribe in the background of this process. */
export class InlineMediaJobs implements MediaJobs {
  constructor(
    private storage: MediaStorage,
    private worker: MediaWorker,
  ) {}
  private running = new Set<string>();
  async start(job: MediaJob) {
    if (this.running.has(job.objectPath)) return;
    await requireUploaded(this.storage, job.objectPath);
    this.running.add(job.objectPath);
    void this.worker
      .process(job, true)
      .finally(() => this.running.delete(job.objectPath))
      .catch((error: unknown) =>
        console.error(
          JSON.stringify({ severity: 'ERROR', event: 'media_job_failed', error: String(error) }),
        ),
      );
  }
}

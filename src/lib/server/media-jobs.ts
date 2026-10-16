import type { MediaJobs, MediaStorage } from '../application/ports';
import type { MediaWorker } from '../application/media-worker';
import { ApiError } from './errors';
import type { CloudTasksQueue } from './cloud-tasks';

/** The browser says an upload finished; storage, not the browser, decides whether it did. */
async function requireUploaded(storage: MediaStorage, objectPath: string) {
  if (!(await storage.exists(objectPath)))
    throw new ApiError(409, 'The recording has not finished uploading. Try again.');
}

/** Production: transcription runs as a Cloud Task, beyond the request's lifetime. */
export class QueuedMediaJobs implements MediaJobs {
  constructor(
    private storage: MediaStorage,
    private queue: CloudTasksQueue,
    private workerUrl: string,
  ) {}
  async start(job: { objectPath: string }) {
    await requireUploaded(this.storage, job.objectPath);
    await this.queue.post(this.workerUrl, job);
  }
}

/** Without Cloud Tasks (local development): transcribe in the background of this process. */
export class InlineMediaJobs implements MediaJobs {
  constructor(
    private storage: MediaStorage,
    private worker: MediaWorker,
  ) {}
  async start(job: { objectPath: string }) {
    await requireUploaded(this.storage, job.objectPath);
    void this.worker
      .process(job, true)
      .catch((error: unknown) =>
        console.error(
          JSON.stringify({ severity: 'ERROR', event: 'media_job_failed', error: String(error) }),
        ),
      );
  }
}

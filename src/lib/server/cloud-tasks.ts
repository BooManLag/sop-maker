import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import type { AnalysisJob, AnalysisQueue } from '../application/analysis/worker';

export interface TasksSettings {
  /** projects/<p>/locations/<r>/queues/<q> */
  queue: string;
  /** Absolute URL of the worker endpoint; also the OIDC audience. */
  workerUrl: string;
  /** Service account Cloud Tasks signs requests as. */
  invokerEmail: string;
}

/** The media worker endpoint sits beside the analysis one and shares its queue and invoker. */
export function mediaWorkerUrl(settings: TasksSettings) {
  const url = new URL(settings.workerUrl);
  url.pathname = '/api/v1/internal/media';
  return url.toString();
}
/** Enqueues a job body for a worker endpoint. */
export interface TaskQueue {
  /** A `taskId` makes the enqueue idempotent: Cloud Tasks refuses a second task with that name. */
  post(url: string, job: object, taskId?: string): Promise<void>;
}

export class CloudTasksQueue implements AnalysisQueue, TaskQueue {
  private auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  constructor(private settings: TasksSettings) {}
  enqueue(job: AnalysisJob) {
    return this.post(this.settings.workerUrl, job);
  }
  /** Delivers any job body to a worker endpoint, signed for that endpoint's audience. */
  async post(url: string, job: object, taskId?: string) {
    try {
      await this.create(url, job, taskId);
    } catch (error) {
      // A named task that already exists means this job was already queued.
      if (taskId && (error as { status?: number }).status === 409) return;
      throw error;
    }
  }
  private async create(url: string, job: object, taskId?: string) {
    const client = await this.auth.getClient();
    await client.request({
      url: `https://cloudtasks.googleapis.com/v2/${this.settings.queue}/tasks`,
      method: 'POST',
      data: {
        task: {
          ...(taskId ? { name: `${this.settings.queue}/tasks/${taskId}` } : {}),
          dispatchDeadline: '300s',
          httpRequest: {
            httpMethod: 'POST',
            url,
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from(JSON.stringify(job)).toString('base64'),
            oidcToken: {
              serviceAccountEmail: this.settings.invokerEmail,
              audience: url,
            },
          },
        },
      },
    });
  }
}

/** Accepts only requests carrying a Google-signed ID token for the Cloud Tasks invoker account. */
export function cloudTasksVerifier(settings: TasksSettings, audience = settings.workerUrl) {
  const client = new OAuth2Client();
  return async (request: Request) => {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return false;
    try {
      const ticket = await client.verifyIdToken({ idToken: token, audience });
      const payload = ticket.getPayload();
      return payload?.email === settings.invokerEmail && payload.email_verified === true;
    } catch {
      return false;
    }
  };
}

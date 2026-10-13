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

export class CloudTasksQueue implements AnalysisQueue {
  private auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  constructor(private settings: TasksSettings) {}
  async enqueue(job: AnalysisJob) {
    const client = await this.auth.getClient();
    await client.request({
      url: `https://cloudtasks.googleapis.com/v2/${this.settings.queue}/tasks`,
      method: 'POST',
      data: {
        task: {
          dispatchDeadline: '300s',
          httpRequest: {
            httpMethod: 'POST',
            url: this.settings.workerUrl,
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from(JSON.stringify(job)).toString('base64'),
            oidcToken: {
              serviceAccountEmail: this.settings.invokerEmail,
              audience: this.settings.workerUrl,
            },
          },
        },
      },
    });
  }
}

/** Accepts only requests carrying a Google-signed ID token for the Cloud Tasks invoker account. */
export function cloudTasksVerifier(settings: TasksSettings) {
  const client = new OAuth2Client();
  return async (request: Request) => {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return false;
    try {
      const ticket = await client.verifyIdToken({ idToken: token, audience: settings.workerUrl });
      const payload = ticket.getPayload();
      return payload?.email === settings.invokerEmail && payload.email_verified === true;
    } catch {
      return false;
    }
  };
}

import { ApiError } from './errors';
import { extractionSchema } from './contracts';
import { LIMITS } from './config';
import type { CaptureAdapter } from '../services';
/** No tools, remote URLs, credentials or authoritative writes are offered to the model. */
export class GuardedCaptureAdapter {
  private failures = 0;
  private blockedUntil = 0;
  private active = 0;
  constructor(private adapter: CaptureAdapter) {}
  async extract(text: string, sample: boolean) {
    if (text.length > LIMITS.captureCharacters)
      throw new ApiError(413, 'The walkthrough is too long.');
    if (this.active >= 4 || Date.now() < this.blockedUntil)
      throw new ApiError(503, 'Walkthrough processing is temporarily unavailable.');
    this.active++;
    let timer: NodeJS.Timeout | undefined;
    const abort = new AbortController();
    try {
      const operation = (async () => {
        const steps = await this.adapter.extract(text, sample, {
          signal: abort.signal,
          maxOutputTokens: LIMITS.aiOutputTokens,
        });
        const questions = await this.adapter.questions(steps);
        const result = extractionSchema.safeParse({ steps, questions });
        if (!result.success)
          throw new ApiError(503, 'The extraction returned an invalid draft. Nothing was saved.');
        return result.data;
      })();
      // Release the provider slot only when the underlying operation settles, even after a timeout.
      operation.then(
        () => {
          this.active--;
        },
        () => {
          this.active--;
        },
      );
      const result = await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            abort.abort();
            reject(new ApiError(503, 'Walkthrough processing timed out. Nothing was saved.'));
          }, LIMITS.aiTimeoutMs);
        }),
      ]);
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      if (this.failures >= 3) this.blockedUntil = Date.now() + 30_000;
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        503,
        'Walkthrough processing is unavailable. No fallback results were substituted.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
export class UnavailableCaptureAdapter implements CaptureAdapter {
  async extract(): Promise<never> {
    throw new ApiError(503, 'Gemini processing is not configured. No model request was sent.');
  }
  async questions(): Promise<never> {
    throw new ApiError(503, 'Gemini processing is not configured.');
  }
}

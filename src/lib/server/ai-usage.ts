/** Feeds the log-based metrics in infra/monitoring.tf; field names here are part of that contract. */
export type AiFeature =
  'capture_extract' | 'capture_questions' | 'capture_transcribe' | 'scan_group' | 'scan_agent';
export interface AiUsage {
  feature: AiFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  durationMs: number;
  ok: boolean;
  /** Why a failed call failed; the message only, never the request. */
  error?: string;
}
export interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
}
export const tokens = (u?: UsageMetadata) => ({
  input: u?.promptTokenCount ?? 0,
  output: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
});
export function logAiUsage(usage: AiUsage) {
  console.log(
    JSON.stringify({ severity: usage.ok ? 'INFO' : 'WARNING', event: 'ai_usage', ...usage }),
  );
}
/** Times an AI call and logs its usage whether it succeeds or throws. */
export async function metered<T>(
  feature: AiFeature,
  model: string,
  call: () => Promise<{ value: T; input: number; output: number; calls?: number }>,
): Promise<T> {
  const started = performance.now();
  try {
    const { value, input, output, calls = 1 } = await call();
    logAiUsage({
      feature,
      model,
      inputTokens: input,
      outputTokens: output,
      calls,
      durationMs: Math.round(performance.now() - started),
      ok: true,
    });
    return value;
  } catch (error) {
    logAiUsage({
      feature,
      model,
      inputTokens: 0,
      outputTokens: 0,
      calls: 1,
      durationMs: Math.round(performance.now() - started),
      ok: false,
      error: describeError(error),
    });
    throw error;
  }
}
const describeError = (error: unknown) =>
  (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 300);

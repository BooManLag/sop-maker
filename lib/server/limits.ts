import { LIMITS } from './config';
import { ApiError } from './errors';
export class AdmissionControl {
  private active = 0;
  private windows = new Map<string, { count: number; expiresAt: number }>();
  private accepting = true;
  enter() {
    if (!this.accepting || this.active >= LIMITS.activeRequests)
      throw new ApiError(503, 'The service is busy. Retry shortly.', 'UNAVAILABLE', 1);
    this.active++;
    return () => {
      this.active--;
    };
  }
  rate(key: string, limit: number = LIMITS.requestsPerMinute, now = Date.now()) {
    for (const [key, value] of this.windows) if (value.expiresAt <= now) this.windows.delete(key);
    let window = this.windows.get(key);
    if (!window) {
      if (this.windows.size >= 2000) throw new ApiError(503, 'Rate limiter capacity reached.');
      window = { count: 0, expiresAt: now + 60000 };
      this.windows.set(key, window);
    }
    if (window.count >= limit)
      throw new ApiError(
        429,
        'Too many requests. Retry shortly.',
        'RATE_LIMITED',
        Math.ceil((window.expiresAt - now) / 1000),
      );
    window.count++;
  }
  async drain(timeoutMs = 8000) {
    this.accepting = false;
    const deadline = Date.now() + timeoutMs;
    while (this.active && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 25));
    return this.active === 0;
  }
  get isAccepting() {
    return this.accepting;
  }
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'Content-Type must be application/json.');
  if (
    request.headers.has('content-encoding') &&
    request.headers.get('content-encoding') !== 'identity'
  )
    throw new ApiError(415, 'Compressed request bodies are not accepted.');
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > LIMITS.bodyBytes))
    throw new ApiError(413, 'Request body exceeds the 1 MB limit.');
  const reader = request.body?.getReader();
  if (!reader) return {};
  let timer: NodeJS.Timeout | undefined;
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    const consume = (async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > LIMITS.bodyBytes)
          throw new ApiError(413, 'Request body exceeds the 1 MB limit.');
        chunks.push(value);
      }
      return Buffer.concat(chunks).toString('utf8');
    })();
    const raw = await Promise.race([
      consume,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void reader.cancel().catch(() => {});
          reject(new ApiError(400, 'Request body timed out.'));
        }, LIMITS.bodyTimeoutMs);
      }),
    ]);
    let value: unknown;
    try {
      value = raw ? JSON.parse(raw) : {};
    } catch {
      throw new ApiError(400, 'Request body must contain valid JSON.');
    }
    let nodes = 0;
    const stack: [unknown, number][] = [[value, 0]];
    while (stack.length) {
      const [node, depth] = stack.pop()!;
      if (++nodes > LIMITS.bodyNodes || depth > LIMITS.bodyDepth)
        throw new ApiError(413, 'JSON nesting or element count exceeds the request limit.');
      if (node && typeof node === 'object') {
        for (const [key, child] of Object.entries(node)) {
          if (['__proto__', 'prototype', 'constructor'].includes(key))
            throw new ApiError(400, 'Unsafe object keys are not accepted.');
          stack.push([child, depth + 1]);
        }
      }
    }
    return value;
  } finally {
    clearTimeout(timer);
    await reader.cancel().catch(() => {});
  }
}

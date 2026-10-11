import { createHash } from 'node:crypto';
export interface RequestEvent {
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  actorId?: string;
  organizationId?: string;
  code?: string;
}
export class Observability {
  private counts = new Map<string, number>();
  private durations: number[] = [];
  private inflight = 0;
  constructor(
    private sink: (entry: Record<string, unknown>) => void = (entry) =>
      console.log(JSON.stringify(entry)),
  ) {}
  begin() {
    this.inflight++;
  }
  finish(event: RequestEvent) {
    this.inflight--;
    const { actorId, organizationId, ...safe } = event;
    const pseudonym = (id: string) => createHash('sha256').update(id).digest('hex').slice(0, 16);
    this.sink({
      severity: event.status >= 500 ? 'ERROR' : event.status >= 400 ? 'WARNING' : 'INFO',
      event: 'http_request',
      ...safe,
      ...(actorId ? { actor: pseudonym(actorId) } : {}),
      ...(organizationId ? { tenant: pseudonym(organizationId) } : {}),
      timestamp: new Date().toISOString(),
    });
    const key = `${event.method} ${event.route} ${Math.floor(event.status / 100)}xx`;
    if (this.counts.size < 200 || this.counts.has(key))
      this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    this.durations.push(event.durationMs);
    if (this.durations.length > 1000) this.durations.shift();
  }
  snapshot() {
    const sorted = [...this.durations].sort((a, b) => a - b);
    return {
      requests: Object.fromEntries(this.counts),
      inflight: this.inflight,
      latencyMs: {
        sampleSize: sorted.length,
        p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
      },
      memoryBytes: process.memoryUsage().rss,
      scope: 'one process; last 1000 requests',
    };
  }
}

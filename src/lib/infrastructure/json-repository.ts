import { mkdir, readFile, rename, open, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import lockfile from 'proper-lockfile';
import type { Repository, RepositoryProvider } from '../application/ports';
import {
  AUDIT_RETENTION_MS,
  type AuditEvent,
  type Store,
  initialStore,
  migrateStore,
  takeAuditEvents,
  validateStore,
} from '../application/store';
import type { ListQuery } from '../server/contracts';
import { ApiError, requireCondition } from '../server/errors';
import { LIMITS } from '../server/config';
export class JsonRepository implements Repository {
  private queue: Promise<unknown> = Promise.resolve();
  private pending = 0;
  constructor(
    readonly directory: string,
    readonly organizationId = 'demo-org',
    private seedDemo = organizationId === 'demo-org',
  ) {}
  private get file() {
    return path.join(this.directory, 'store.json');
  }
  /** One JSON event per line, appended before the state that drops them is written. */
  get auditFile() {
    return path.join(this.directory, 'audit.jsonl');
  }
  /** Events within retention, oldest first; a repeated line from an interrupted commit counts once. */
  async auditEvents(now = Date.now()): Promise<AuditEvent[]> {
    let text = '';
    try {
      text = await readFile(this.auditFile, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    const events = new Map<string, AuditEvent>();
    for (const line of text.split('\n')) {
      if (!line) continue;
      const event = JSON.parse(line) as AuditEvent;
      if (Date.parse(event.timestamp) > now - AUDIT_RETENTION_MS) events.set(event.id, event);
    }
    return [...events.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  async read(): Promise<Store> {
    try {
      const info = await stat(this.file);
      requireCondition(
        info.size <= LIMITS.stateBytes,
        'Stored data exceeds the configured capacity.',
        503,
      );
      return migrateStore(JSON.parse(await readFile(this.file, 'utf8')), this.organizationId);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        return initialStore(this.organizationId, this.seedDemo);
      throw e;
    }
  }
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.pending >= LIMITS.waitingRequests)
      return Promise.reject(new ApiError(503, 'The data store is busy. Retry shortly.'));
    this.pending++;
    const task = this.queue.then(fn);
    this.queue = task.catch(() => {});
    return task.finally(() => {
      this.pending--;
    });
  }
  query<T>(fn: (store: Store) => T): Promise<T> {
    return this.enqueue(async () => fn(await this.read()));
  }
  transact<T>(fn: (store: Store) => T): Promise<T> {
    return this.enqueue(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      let release: () => Promise<void>;
      try {
        release = await lockfile.lock(this.directory, {
          realpath: false,
          stale: 10000,
          update: 3000,
          retries: { retries: 6, factor: 1.5, minTimeout: 25, maxTimeout: 200, randomize: true },
        });
      } catch {
        throw new ApiError(503, 'The data store is busy. Retry shortly.');
      }
      const temporary = path.join(this.directory, `store-${randomUUID()}.tmp`);
      try {
        const store = await this.read();
        const result = fn(store);
        requireCondition(
          !(result instanceof Promise),
          'Repository transactions must not perform asynchronous I/O.',
          500,
        );
        store.revision++;
        const events = takeAuditEvents(store, Infinity);
        validateStore(store, this.organizationId);
        if (events.length) {
          const log = await open(this.auditFile, 'a', 0o600);
          try {
            await log.writeFile(events.map((e) => JSON.stringify(e) + '\n').join(''));
            await log.sync();
          } finally {
            await log.close();
          }
        }
        const handle = await open(temporary, 'wx', 0o600);
        try {
          await handle.writeFile(JSON.stringify(store));
          await handle.sync();
        } finally {
          await handle.close();
        }
        await rename(temporary, this.file);
        // Windows cannot fsync a directory handle (EPERM); NTFS journals the rename itself.
        if (process.platform !== 'win32') {
          const dir = await open(this.directory, 'r');
          try {
            await dir.sync();
          } finally {
            await dir.close();
          }
        }
        return result;
      } finally {
        await unlink(temporary).catch(() => {});
        await release();
      }
    });
  }
  listAudit(query: ListQuery) {
    return this.enqueue(async () => {
      const events = await this.auditEvents();
      if (query.sort === 'desc') events.reverse();
      const offset = Number(query.cursor);
      const end = offset + query.limit;
      return {
        items: events.slice(offset, end),
        nextCursor: end < events.length ? String(end) : null,
        total: events.length,
      };
    });
  }
  async health() {
    await this.query(() => undefined);
  }
}
export class JsonRepositoryProvider implements RepositoryProvider {
  private repositories = new Map<string, JsonRepository>();
  constructor(private directory: string) {}
  forTenant(organizationId: string) {
    requireCondition(
      /^[A-Za-z0-9_-]{1,128}$/.test(organizationId),
      'Invalid organization namespace.',
      403,
    );
    let repository = this.repositories.get(organizationId);
    if (!repository) {
      requireCondition(this.repositories.size < 1000, 'Repository capacity reached.', 503);
      repository = new JsonRepository(
        organizationId === 'demo-org'
          ? this.directory
          : path.join(this.directory, 'tenants', organizationId),
        organizationId,
      );
      this.repositories.set(organizationId, repository);
    }
    return repository;
  }
}

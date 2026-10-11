import { mkdir, readFile, rename, open, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import lockfile from 'proper-lockfile';
import type { Repository, RepositoryProvider } from '../application/ports';
import { type Store, initialStore, migrateStore, validateStore } from '../application/store';
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
        validateStore(store, this.organizationId);
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

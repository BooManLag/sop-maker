import type { Firestore } from 'firebase-admin/firestore';
import type { Repository, RepositoryProvider } from '../application/ports';
import { initialStore, migrateStore, validateStore, type Store } from '../application/store';
import { ApiError, requireCondition } from '../server/errors';
/** Foundation storage: one bounded aggregate per tenant. Firestore provides cross-instance serializable transactions. */
export class FirestoreRepository implements Repository {
  constructor(
    private database: Firestore,
    private organizationId: string,
  ) {}
  private get reference() {
    return this.database.doc(`organizations/${this.organizationId}/backend/state`);
  }
  async read() {
    try {
      const snapshot = await this.reference.get();
      return snapshot.exists
        ? migrateStore(JSON.parse(snapshot.get('payload')), this.organizationId)
        : initialStore(this.organizationId, false);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'The database is temporarily unavailable.');
    }
  }
  async query<T>(fn: (store: Store) => T) {
    return fn(await this.read());
  }
  async transact<T>(fn: (store: Store) => T): Promise<T> {
    try {
      return await this.database.runTransaction(
        async (transaction) => {
          const snapshot = await transaction.get(this.reference);
          const store = snapshot.exists
            ? migrateStore(JSON.parse(snapshot.get('payload')), this.organizationId)
            : initialStore(this.organizationId, false);
          const result = fn(store);
          requireCondition(
            !(result instanceof Promise),
            'Repository transactions must not perform asynchronous I/O.',
            500,
          );
          store.revision++;
          validateStore(store, this.organizationId);
          transaction.set(this.reference, {
            schemaVersion: 2,
            revision: store.revision,
            payload: JSON.stringify(store),
            updatedAt: new Date(),
          });
          return result;
        },
        { maxAttempts: 3 },
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        503,
        'The database is temporarily unavailable. Retry with the same idempotency key.',
      );
    }
  }
  async health() {
    await this.read();
  }
}
export class FirestoreRepositoryProvider implements RepositoryProvider {
  constructor(private database: Firestore) {}
  forTenant(organizationId: string) {
    requireCondition(
      /^[A-Za-z0-9_-]{1,128}$/.test(organizationId),
      'Invalid organization namespace.',
      403,
    );
    return new FirestoreRepository(this.database, organizationId);
  }
}

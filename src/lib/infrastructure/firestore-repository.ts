import type { Firestore } from 'firebase-admin/firestore';
import type { Repository, RepositoryProvider } from '../application/ports';
import {
  AUDIT_RETENTION_MS,
  initialStore,
  migrateStore,
  takeAuditEvents,
  validateStore,
  type AuditEvent,
  type Store,
} from '../application/store';
import type { ListQuery } from '../server/contracts';
import { ApiError, requireCondition } from '../server/errors';
/**
 * Foundation storage: one bounded aggregate per tenant, plus an audit log outside it.
 * Firestore provides cross-instance serializable transactions.
 */
export class FirestoreRepository implements Repository {
  constructor(
    private database: Firestore,
    private organizationId: string,
  ) {}
  private get reference() {
    return this.database.doc(`organizations/${this.organizationId}/backend/state`);
  }
  private get audit() {
    return this.database.collection(`organizations/${this.organizationId}/auditEvents`);
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
          const events = takeAuditEvents(store);
          validateStore(store, this.organizationId);
          transaction.set(this.reference, {
            schemaVersion: 2,
            revision: store.revision,
            payload: JSON.stringify(store),
            updatedAt: new Date(),
          });
          for (const event of events)
            transaction.set(this.audit.doc(event.id), {
              ...event,
              expireAt: new Date(Date.parse(event.timestamp) + AUDIT_RETENTION_MS),
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
  async listAudit(query: ListQuery) {
    // TTL deletion lags, so expired events are filtered here. expireAt is a fixed offset from
    // the event time, so ordering by it is time order on one single-field index.
    const live = this.audit.where('expireAt', '>', new Date());
    const offset = Number(query.cursor);
    let snapshot, count;
    try {
      [snapshot, count] = await Promise.all([
        live.orderBy('expireAt', query.sort).offset(offset).limit(query.limit).get(),
        live.count().get(),
      ]);
    } catch {
      throw new ApiError(503, 'The database is temporarily unavailable.');
    }
    const total = count.data().count;
    const items = snapshot.docs.map((doc) => {
      const { expireAt: _, ...event } = doc.data();
      return event as AuditEvent;
    });
    const end = offset + items.length;
    return { items, nextCursor: end < total ? String(end) : null, total };
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

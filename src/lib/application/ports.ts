import type { Store } from './store';
export type ReadOperation<T> = (store: Store) => T;
export interface Repository {
  read(): Promise<Store>;
  query<T>(fn: ReadOperation<T>): Promise<T>;
  transact<T>(fn: ReadOperation<T>): Promise<T>;
  health(): Promise<void>;
}
export interface RepositoryProvider {
  forTenant(organizationId: string): Repository;
}

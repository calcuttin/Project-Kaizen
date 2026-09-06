import { del, get, set } from 'idb-keyval';
import type { EntityRepository, Query } from '@kaizen/domain';
import { queueSyncOperation } from '@/core/sync/outbox';
import { getSyncScope } from '@/core/sync/outbox';
import { storeKey, workspaceAvailable } from './storage';

export type { EntityRepository, Query } from '@kaizen/domain';

const matches = <T extends object>(entity: T, where?: Partial<T>) => !where || Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);

/** Small repository used by imports and new domain services without coupling them to Zustand. */
export class LocalRepository<T extends { id: string }> implements EntityRepository<T> {
  private readonly storageKey: string;
  constructor(collection: string) {
    if (!workspaceAvailable()) throw new Error('Workspace is not ready');
    this.storageKey = storeKey(`repo:${collection}`);
  }

  private key() { return this.storageKey; }

  async list(query?: Query<T>): Promise<T[]> {
    const records = Object.values((await get<Record<string, T>>(this.key())) ?? {}).filter((record) => (query?.includeDeleted || !('deletedAt' in record) || !record.deletedAt) && matches(record, query?.where));
    return query?.limit ? records.slice(0, query.limit) : records;
  }

  async get(id: string): Promise<T | null> {
    const records = (await get<Record<string, T>>(this.key())) ?? {};
    return records[id] ?? null;
  }

  async put(entity: T): Promise<void> {
    const records = (await get<Record<string, T>>(this.key())) ?? {};
    await set(this.key(), { ...records, [entity.id]: entity });
  }

  async remove(id: string): Promise<void> {
    const records = (await get<Record<string, T>>(this.key())) ?? {};
    const { [id]: _removed, ...next } = records;
    if (Object.keys(next).length) await set(this.key(), next);
    else await del(this.key());
  }
}

/** IndexedDB-first repository that also records idempotent mutations for cloud delivery. */
export class SyncedRepository<T extends { id: string; revision?: number }> implements EntityRepository<T> {
  private readonly owner = getSyncScope();
  constructor(private readonly entityType: string, private readonly local: EntityRepository<T>) {}

  list(query?: Query<T>) { return this.local.list(query); }
  get(id: string) { return this.local.get(id); }

  async put(entity: T) {
    await this.local.put(entity);
    await queueSyncOperation({ entityType: this.entityType, entityId: entity.id, operation: 'put', baseRevision: entity.revision, payload: entity }, this.owner);
  }

  async remove(id: string) {
    const current = await this.local.get(id);
    await this.local.remove(id);
    await queueSyncOperation({ entityType: this.entityType, entityId: id, operation: 'delete', baseRevision: current?.revision }, this.owner);
  }
}

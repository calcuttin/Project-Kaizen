import { del, get, set } from 'idb-keyval';
import { newId, nowIso } from '@/core/ids';
import type { SyncConflict, SyncOperation } from './types';

const OUTBOX_KEY = 'kaizen:sync:v2:outbox';
const CURSOR_KEY = 'kaizen:sync:v2:cursor';
const CONFLICTS_KEY = 'kaizen:sync:v2:conflicts';
const MIGRATED_KEY = 'kaizen:sync:v2:device-migrated';
let syncScope = 'device';
let writeChain: Promise<void> = Promise.resolve();

const scoped = (key: string, owner = syncScope) => `${key}:${owner}`;
export const getSyncScope = () => syncScope;
export function setSyncScope(ownerId?: string) { syncScope = ownerId || 'device'; }
const readAt = async (key: string) => (await get<SyncOperation[]>(key)) ?? [];
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = writeChain.then(work, work);
  writeChain = result.then(() => undefined, () => undefined);
  return result;
}

export async function queueSyncOperation(input: Omit<SyncOperation, 'mutationId' | 'occurredAt'>, owner = syncScope) {
  const next: SyncOperation = { ...input, mutationId: newId(), occurredAt: nowIso() };
  const key = scoped(OUTBOX_KEY, owner);
  await serialize(async () => {
    const operations = await readAt(key);
    const compacted = operations.filter((item) => !(item.entityType === next.entityType && item.entityId === next.entityId));
    await set(key, [...compacted, next]);
  });
  return next;
}

export async function queueSyncOperations(inputs: Omit<SyncOperation, 'mutationId' | 'occurredAt'>[], owner = syncScope) {
  const key = scoped(OUTBOX_KEY, owner);
  await serialize(async () => {
    const byEntity = new Map((await readAt(key)).map((operation) => [`${operation.entityType}:${operation.entityId}`, operation]));
    for (const input of inputs) {
      const next: SyncOperation = { ...input, mutationId: newId(), occurredAt: nowIso() };
      byEntity.set(`${next.entityType}:${next.entityId}`, next);
    }
    await set(key, [...byEntity.values()]);
  });
}

export async function readOutbox(owner = syncScope): Promise<SyncOperation[]> { await writeChain; return readAt(scoped(OUTBOX_KEY, owner)); }
export async function removeOutboxMutations(ids: string[], owner = syncScope) {
  const removed = new Set(ids);
  const key = scoped(OUTBOX_KEY, owner);
  await serialize(async () => { await set(key, (await readAt(key)).filter((item) => !removed.has(item.mutationId))); });
}
export async function readSyncCursor(owner = syncScope): Promise<number> { return (await get<number>(scoped(CURSOR_KEY, owner))) ?? 0; }
export async function writeSyncCursor(cursor: number, owner = syncScope) { await set(scoped(CURSOR_KEY, owner), cursor); }
export async function readConflicts(owner = syncScope): Promise<SyncConflict[]> { return (await get<SyncConflict[]>(scoped(CONFLICTS_KEY, owner))) ?? []; }
export async function addConflict(conflict: SyncConflict, owner = syncScope) {
  await serialize(async () => { await set(scoped(CONFLICTS_KEY, owner), [...await readConflicts(owner), conflict]); });
}
export async function removeConflict(id: string, owner = syncScope) {
  await serialize(async () => { await set(scoped(CONFLICTS_KEY, owner), (await readConflicts(owner)).filter((item) => item.id !== id)); });
}
export async function deviceDataMigrated(owner = syncScope): Promise<boolean> { return (await get<boolean>(scoped(MIGRATED_KEY, owner))) ?? false; }
export async function markDeviceDataMigrated(owner = syncScope) { await set(scoped(MIGRATED_KEY, owner), true); }
export async function clearSyncData(owner = syncScope) {
  await serialize(async () => { await Promise.all([OUTBOX_KEY, CURSOR_KEY, CONFLICTS_KEY, MIGRATED_KEY].map((key) => del(scoped(key, owner)))); });
}

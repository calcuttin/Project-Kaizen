import { registeredStores } from '@/core/store';
import { queueSyncOperation, queueSyncOperations } from './outbox';
import type { RemoteChange } from './types';

type Entity = Record<string, unknown> & { id: string; revision?: number; updatedAt?: string };
type Descriptor = { store: string; field: string; entityType: string; shape: 'record' | 'array' | 'date-record' | 'nested-date-record' | 'singleton' };

const descriptors: Descriptor[] = [
  { store: 'tasks', field: 'projects', entityType: 'projects', shape: 'record' },
  { store: 'tasks', field: 'tasks', entityType: 'tasks', shape: 'record' },
  { store: 'journal', field: 'entries', entityType: 'day_entries', shape: 'date-record' },
  { store: 'studio', field: 'channels', entityType: 'channels', shape: 'record' },
  { store: 'studio', field: 'pieces', entityType: 'content_pieces', shape: 'record' },
  { store: 'studio', field: 'snapshots', entityType: 'metric_snapshots', shape: 'array' },
  { store: 'health', field: 'habits', entityType: 'habits', shape: 'record' },
  { store: 'health', field: 'logs', entityType: 'habit_logs', shape: 'nested-date-record' },
  { store: 'health', field: 'goals', entityType: 'health_goals', shape: 'record' },
  { store: 'library', field: 'shelves', entityType: 'shelves', shape: 'record' },
  { store: 'library', field: 'books', entityType: 'books', shape: 'record' },
  { store: 'library', field: 'sessions', entityType: 'reading_sessions', shape: 'array' },
  { store: 'library', field: 'annotations', entityType: 'reading_annotations', shape: 'record' },
  { store: 'library', field: 'goal', entityType: 'reading_goals', shape: 'singleton' },
  { store: 'feed', field: 'sources', entityType: 'feed_sources', shape: 'record' },
  { store: 'feed', field: 'items', entityType: 'feed_items', shape: 'record' },
  { store: 'imports', field: 'runs', entityType: 'import_runs', shape: 'array' },
];

let applyingRemote = false;

function entities(descriptor: Descriptor, state: Record<string, unknown>): Map<string, Entity> {
  const value = state[descriptor.field];
  if (descriptor.shape === 'array') return new Map(((value as Entity[] | undefined) ?? []).map((entity) => [entity.id, entity]));
  if (descriptor.shape === 'singleton') {
    if (!value || typeof value !== 'object') return new Map();
    const entity = value as Record<string, unknown>;
    const id = String(entity.id ?? entity.year ?? descriptor.field);
    return new Map([[id, { ...entity, id } as Entity]]);
  }
  if (descriptor.shape === 'nested-date-record') {
    const result = new Map<string, Entity>();
    for (const [parentId, dates] of Object.entries((value as Record<string, Record<string, number>> | undefined) ?? {})) {
      for (const [date, amount] of Object.entries(dates)) {
        const id = `${parentId}:${date}`;
        result.set(id, { id, habitId: parentId, date, value: amount });
      }
    }
    return result;
  }
  if (!value || typeof value !== 'object') return new Map();
  return new Map(Object.entries(value as Record<string, Record<string, unknown>>).map(([key, entity]) => [key, { ...entity, id: typeof entity.id === 'string' ? entity.id : key }] as [string, Entity]));
}

export function deviceEntityCounts() {
  const stores = registeredStores();
  return descriptors.map((descriptor) => {
    const store = stores.get(descriptor.store);
    return { entityType: descriptor.entityType, count: store ? entities(descriptor, store.getState() as Record<string, unknown>).size : 0 };
  }).filter((item) => item.count > 0);
}

export function deviceDuplicateWarnings(): string[] {
  const library = registeredStores().get('library')?.getState() as { books?: Record<string, { title?: string; author?: string; isbn?: string }> } | undefined;
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  for (const book of Object.values(library?.books ?? {})) {
    const isbn = book.isbn?.replace(/[^0-9X]/gi, '');
    const identity = isbn ? `isbn:${isbn}` : `book:${book.title?.trim().toLowerCase()}|${book.author?.trim().toLowerCase()}`;
    if (seen.has(identity)) warnings.push(`“${book.title || 'Untitled'}” may already exist in this library.`);
    else seen.set(identity, book.title ?? 'Untitled');
  }
  return warnings;
}

export async function queueAllDeviceEntities() {
  const stores = registeredStores();
  const operations: Parameters<typeof queueSyncOperations>[0] = [];
  for (const descriptor of descriptors) {
    const store = stores.get(descriptor.store);
    if (!store) continue;
    for (const entity of entities(descriptor, store.getState() as Record<string, unknown>).values()) {
      operations.push({ entityType: descriptor.entityType, entityId: entity.id, operation: 'put', baseRevision: entity.revision, payload: entity });
    }
  }
  await queueSyncOperations(operations);
}

export function watchStoresForSync(): () => void {
  const stores = registeredStores();
  const stops: (() => void)[] = [];
  for (const descriptor of descriptors) {
    const store = stores.get(descriptor.store);
    if (!store) continue;
    stops.push(store.subscribe((state, previous) => {
      if (applyingRemote) return;
      const current = entities(descriptor, state as Record<string, unknown>);
      const before = entities(descriptor, previous as Record<string, unknown>);
      for (const [id, entity] of current) {
        if (JSON.stringify(entity) !== JSON.stringify(before.get(id))) void queueSyncOperation({ entityType: descriptor.entityType, entityId: id, operation: 'put', baseRevision: entity.revision, payload: entity });
      }
      for (const [id, entity] of before) if (!current.has(id)) void queueSyncOperation({ entityType: descriptor.entityType, entityId: id, operation: 'delete', baseRevision: entity.revision });
    }));
  }
  return () => stops.forEach((stop) => stop());
}

export function applyRemoteChanges(changes: RemoteChange[]) {
  const stores = registeredStores();
  applyingRemote = true;
  try {
    for (const change of changes) {
      const descriptor = descriptors.find((item) => item.entityType === change.entity_type);
      if (!descriptor) continue;
      const store = stores.get(descriptor.store);
      if (!store) continue;
      const state = store.getState() as Record<string, unknown>;
      if (descriptor.shape === 'nested-date-record') {
        const records = { ...((state[descriptor.field] as Record<string, Record<string, number>> | undefined) ?? {}) };
        const payload = change.payload as { habitId?: string; date?: string; value?: number } | null;
        const [fallbackHabit, fallbackDate] = change.entity_id.split(':');
        const habitId = payload?.habitId ?? fallbackHabit;
        const date = payload?.date ?? fallbackDate;
        if (habitId && date) {
          const dates = { ...(records[habitId] ?? {}) };
          if (change.operation === 'delete') delete dates[date]; else dates[date] = payload?.value ?? 0;
          if (Object.keys(dates).length) records[habitId] = dates; else delete records[habitId];
          store.setState({ [descriptor.field]: records });
        }
      } else if (descriptor.shape === 'singleton') {
        if (change.operation !== 'delete' && change.payload) store.setState({ [descriptor.field]: { ...change.payload, revision: change.revision } });
      } else if (descriptor.shape === 'array') {
        const list = [...((state[descriptor.field] as Entity[] | undefined) ?? [])];
        const index = list.findIndex((item) => item.id === change.entity_id);
        if (change.operation === 'delete') { if (index >= 0) list.splice(index, 1); }
        else if (change.payload) { const entity = { ...change.payload, id: change.entity_id, revision: change.revision } as Entity; if (index >= 0) list[index] = entity; else list.push(entity); }
        store.setState({ [descriptor.field]: list });
      } else {
        const records = { ...((state[descriptor.field] as Record<string, Entity> | undefined) ?? {}) };
        if (change.operation === 'delete') delete records[change.entity_id];
        else if (change.payload) records[change.entity_id] = { ...change.payload, id: change.entity_id, revision: change.revision } as Entity;
        store.setState({ [descriptor.field]: records });
      }
    }
  } finally { applyingRemote = false; }
}

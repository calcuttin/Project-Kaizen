import { assertSafeJson, isRecord, validateBackupField } from './backupValidation';
import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { cloudStorage, currentWorkspaceOwner, idbStorage, lockWorkspace, selectWorkspace, storeKey } from './storage';
import { clearSyncData } from './sync/outbox';

type WorkspaceStore = { persist: { setOptions: (options: { name: string }) => void; rehydrate: () => Promise<void> | void; hasHydrated: () => boolean; clearStorage: () => void | Promise<void> } };
const workspaceStores = new Map<string, WorkspaceStore>();

/**
 * Creates a zustand store persisted to IndexedDB under a namespaced key.
 * Every module store is created this way so the persistence strategy stays in one place.
 */
export function createPersistedStore<T extends object>(
  name: string,
  version: number,
  initializer: StateCreator<T, [['zustand/persist', unknown]], []>,
  migrate?: (persisted: unknown, fromVersion: number) => unknown,
) {
  const store = create<T>()(
    persist(initializer, {
      name: storeKey(name),
      version,
      storage: createJSONStorage(() => idbStorage),
      skipHydration: cloudStorage,
      migrate,
    }),
  );
  workspaceStores.set(name, store);
  return store;
}

/** Never adopt the legacy shared cache: its owner cannot be established safely. */
export async function openAccountWorkspace(ownerId: string) {
  selectWorkspace(ownerId);
  await Promise.all([...workspaceStores].map(async ([name, store]) => {
    store.persist.setOptions({ name: storeKey(name) });
    await store.persist.rehydrate();
    if (!store.persist.hasHydrated()) throw new Error('Unable to open private browser storage. Please retry.');
  }));
}

/** Registry of every persisted store so Settings can export/import/reset the whole app. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RegisteredStore = { getState: () => object; setState: (partial: any, replace?: any) => unknown; subscribe: (listener: (state: any, previousState: any) => void) => () => void; persist: { rehydrate: () => Promise<void> | void; clearStorage: () => void; hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void } };
const registry = new Map<string, RegisteredStore>();

export function registerStore(name: string, store: RegisteredStore) {
  registry.set(name, store);
}

export const registeredStores = () => new Map(registry);

export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, store] of registry) {
    const state = store.getState() as Record<string, unknown>;
    // Functions are not serializable — strip them.
    out[name] = Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== 'function'));
  }
  return { app: 'kaizen', exportedAt: new Date().toISOString(), stores: out };
}

export function inspectBackup(payload: unknown) {
  if (!isRecord(payload) || payload.app !== 'kaizen' || !isRecord(payload.stores) || !Object.keys(payload.stores).length) throw new Error('Choose a Kaizen JSON backup. Nothing was restored.');
  assertSafeJson(payload);
  const summary: { name: string; collections: { name: string; count: number }[] }[] = [];
  for (const [name, data] of Object.entries(payload.stores)) {
    const store = registry.get(name);
    if (!store || !isRecord(data)) throw new Error(`Unsupported backup area: ${name}. Nothing was restored.`);
    const current = store.getState() as Record<string, unknown>;
    const collections: { name: string; count: number }[] = [];
    for (const [field, value] of Object.entries(data)) {
      if (!Object.hasOwn(current, field) || typeof current[field] === 'function') throw new Error(`Unsupported backup field in ${name}. Nothing was restored.`);
      validateBackupField(`${name}.${field}`, value, current[field]);
      if (Array.isArray(value) || (isRecord(value) && field !== 'goal')) collections.push({ name: field, count: Object.keys(value).length });
    }
    summary.push({ name, collections });
  }
  return summary;
}

export function importAll(payload: unknown) {
  inspectBackup(payload); // Validate every area before mutating any store.
  for (const [name, data] of Object.entries((payload as { stores: Record<string, object> }).stores)) registry.get(name)!.setState(data);
}

export function resetAll() {
  lockWorkspace();
  void Promise.all([
    ...[...workspaceStores.values()].map((store) => store.persist.clearStorage()),
    clearSyncData(currentWorkspaceOwner()),
  ]).then(() => window.location.reload());
}

/** Resolves once a persisted store has finished loading from IndexedDB. */
export function whenHydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void } }): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => { const off = store.persist.onFinishHydration(() => { off(); resolve(); }); });
}

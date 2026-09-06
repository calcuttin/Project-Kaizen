/**
 * Storage adapter for zustand's persist middleware.
 * Backed by IndexedDB (via idb-keyval) so we are not bound by localStorage's ~5MB cap.
 * Swap this adapter for a remote sync layer later without touching any module.
 */
import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

export const cloudStorage = import.meta.env.VITE_KAIZEN_MODE?.toLowerCase() === 'cloud';
let workspaceOwner: string | undefined;
let locked = false;

/** An account switch gets a fresh document; an old callback can never target a new owner. */
export function selectWorkspace(ownerId: string) {
  if (!ownerId || locked || (workspaceOwner && workspaceOwner !== ownerId)) throw new Error('Reload required to change workspace');
  workspaceOwner = ownerId;
}
export function lockWorkspace() { locked = true; }
export const workspaceAvailable = () => !locked && (!cloudStorage || Boolean(workspaceOwner));
export const currentWorkspaceOwner = () => workspaceOwner;

const pendingWrites = new Set<Promise<void>>();
/** Await durable browser writes before reporting a bulk restore complete. */
export async function flushWorkspaceWrites() {
  while (pendingWrites.size) await Promise.all([...pendingWrites]);
}

export const idbStorage: StateStorage = {
  getItem: async (name) => workspaceAvailable() ? (await get<string>(name)) ?? null : null,
  setItem: (name, value) => {
    if (!workspaceAvailable()) return Promise.resolve();
    const write = set(name, value);
    pendingWrites.add(write);
    void write.then(() => pendingWrites.delete(write), () => pendingWrites.delete(write));
    return write;
  },
  removeItem: async (name) => del(name),
};

/** Namespaced key so several Kaizen stores can live side by side. */
export const storeKey = (name: string) => cloudStorage
  ? `kaizen:account:${encodeURIComponent(workspaceOwner ?? 'locked')}:${name}`
  : `kaizen:${name}`;

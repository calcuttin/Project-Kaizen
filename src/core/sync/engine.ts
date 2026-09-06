import { create } from 'zustand';
import { getDeviceId } from '@/core/device';
import { newId, nowIso } from '@/core/ids';
import { getSupabaseClient } from '@/core/supabase';
import { applyRemoteChanges, watchStoresForSync } from './storeBridge';
import { addConflict, getSyncScope, onOutboxChange, readConflicts, readOutbox, readSyncCursor, removeOutboxMutations, writeSyncCursor } from './outbox';
import type { RemoteChange } from './types';
import type { Json } from '@/core/database.types';
import { workspaceAvailable } from '@/core/storage';

export type SyncState = { status: 'device' | 'idle' | 'syncing' | 'offline' | 'error'; pending: number; writing: number; conflicts: number; localError?: boolean; lastSyncedAt?: string; error?: string };
export const useSyncStatus = create<SyncState>(() => ({ status: 'device', pending: 0, writing: 0, conflicts: 0 }));

let activeSync: Promise<void> | null = null;
let syncSession: { owner: string; controller: AbortController } | null = null;
let stopCurrentSync: (() => void) | undefined;
export function stopCloudSync() { stopCurrentSync?.(); stopCurrentSync = undefined; }

export async function syncNow() {
  const session = syncSession;
  if (!session || session.controller.signal.aborted || useSyncStatus.getState().localError) return;
  const current = () => syncSession === session && !session.controller.signal.aborted && workspaceAvailable();
  const supabase = getSupabaseClient();
  if (!supabase) return;
  if (!navigator.onLine) { const pending = (await readOutbox(session.owner)).length; if (current()) useSyncStatus.setState({ status: 'offline', pending }); return; }
  if (activeSync) return activeSync;
  activeSync = (async () => {
    try {
      const operations = await readOutbox(session.owner);
      if (!current()) return;
      useSyncStatus.setState({ status: 'syncing', pending: operations.length, error: undefined });
      for (let offset = 0; offset < operations.length; offset += 100) {
        if (!current()) return;
        const batch = operations.slice(offset, offset + 100);
        const { data, error } = await supabase.rpc('push_changes', { p_device_id: getDeviceId(), p_mutations: batch as unknown as Json }).abortSignal(session.controller.signal);
        if (!current()) return;
        if (error) throw error;
        const outcomes = (data ?? []) as { mutation_id: string; status: string; message?: string; remote_payload?: unknown; remote_revision?: number }[];
        for (const outcome of outcomes.filter((item) => item.status === 'conflict')) {
          const local = batch.find((operation) => operation.mutationId === outcome.mutation_id);
          if (local) await addConflict({ id: newId(), entityType: local.entityType, entityId: local.entityId, local: local.payload, remote: outcome.remote_payload, remoteRevision: outcome.remote_revision, detectedAt: nowIso() }, session.owner);
        }
        await removeOutboxMutations(outcomes.filter((item) => item.status !== 'error').map((item) => item.mutation_id), session.owner);
        const rejected = outcomes.find((item) => item.status === 'error');
        if (rejected) throw new Error(rejected.message ?? 'The server rejected a sync mutation.');
      }
      let cursor = await readSyncCursor(session.owner);
      for (;;) {
        if (!current()) return;
        const { data, error } = await supabase.rpc('pull_changes', { p_after_seq: cursor }).abortSignal(session.controller.signal);
        if (!current()) return;
        if (error) throw error;
        const changes = (data ?? []) as RemoteChange[];
        // A newer local edit may have arrived while the request was in flight.
        const waiting = await readOutbox(session.owner);
        if (!current()) return;
        const protectedIds = new Set(waiting.map((item) => `${item.entityType}:${item.entityId}`));
        applyRemoteChanges(changes.filter((change) => !protectedIds.has(`${change.entity_type}:${change.entity_id}`)));
        if (changes.length) {
          cursor = Math.max(...changes.map((change) => change.seq));
          await writeSyncCursor(cursor, session.owner);
        }
        if (changes.length < 1000) break;
      }
      const pending = (await readOutbox(session.owner)).length;
      if (!current()) return;
      const conflicts = (await readConflicts(session.owner)).length;
      if (!current()) return;
      useSyncStatus.setState({ status: useSyncStatus.getState().localError ? 'error' : navigator.onLine ? 'idle' : 'offline', pending, conflicts, lastSyncedAt: nowIso(), error: undefined });
    } catch (error) {
      const pending = await readOutbox(session.owner).then((items) => items.length, () => useSyncStatus.getState().pending);
      if (!current()) return;
      useSyncStatus.setState({ status: 'error', pending, error: error instanceof Error ? error.message : 'Sync failed' });
    }
  })().finally(() => { if (current()) activeSync = null; });
  return activeSync;
}

export function startCloudSync() {
  stopCloudSync();
  const session = { owner: getSyncScope(), controller: new AbortController() };
  syncSession = session;
  activeSync = null;
  useSyncStatus.setState({ status: 'syncing', pending: 0, writing: 0, conflicts: 0, lastSyncedAt: undefined, error: undefined, localError: false });
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (syncSession !== session || session.controller.signal.aborted) return;
      await syncNow();
      if (syncSession === session && navigator.onLine && useSyncStatus.getState().pending && useSyncStatus.getState().status !== 'error') scheduleSave();
    }, 700);
  };
  const stopQueue = onOutboxChange(({ owner, phase }) => {
    if (owner !== session.owner || syncSession !== session || session.controller.signal.aborted) return;
    if (phase === 'writing') useSyncStatus.setState((state) => ({ writing: state.writing + 1 }));
    else {
      useSyncStatus.setState((state) => ({ writing: Math.max(0, state.writing - 1), ...(phase === 'error' ? { status: 'error' as const, localError: true, error: 'Could not save changes on this device. Export a backup before reloading.' } : {}) }));
      if (phase === 'ready') void readOutbox(owner).then((operations) => {
        if (syncSession !== session || session.controller.signal.aborted || useSyncStatus.getState().localError) return;
        useSyncStatus.setState({ pending: operations.length, status: navigator.onLine ? 'syncing' : 'offline' });
        if (navigator.onLine) scheduleSave();
      }).catch(() => { if (syncSession === session) useSyncStatus.setState({ status: 'error', localError: true }); });
    }
  });
  const stopWatching = watchStoresForSync();
  const onOnline = () => void syncNow();
  const onOffline = () => { if (!useSyncStatus.getState().localError) useSyncStatus.setState({ status: 'offline' }); };
  const onVisibility = () => { if (document.visibilityState === 'visible') void syncNow(); };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);
  const timer = window.setInterval(() => void syncNow(), 60_000);
  void syncNow();
  const stop = () => { session.controller.abort(); clearTimeout(saveTimer); stopQueue(); if (syncSession === session) { syncSession = null; activeSync = null; useSyncStatus.setState({ status: 'device', pending: 0, writing: 0, conflicts: 0, lastSyncedAt: undefined, error: undefined, localError: false }); } stopWatching(); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); document.removeEventListener('visibilitychange', onVisibility); window.clearInterval(timer); };
  stopCurrentSync = stop;
  return stop;
}

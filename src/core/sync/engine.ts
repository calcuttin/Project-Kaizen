import { create } from 'zustand';
import { getDeviceId } from '@/core/device';
import { newId, nowIso } from '@/core/ids';
import { getSupabaseClient } from '@/core/supabase';
import { applyRemoteChanges, watchStoresForSync } from './storeBridge';
import { addConflict, getSyncScope, readOutbox, readSyncCursor, removeOutboxMutations, writeSyncCursor } from './outbox';
import type { RemoteChange } from './types';
import type { Json } from '@/core/database.types';
import { workspaceAvailable } from '@/core/storage';

type SyncState = { status: 'device' | 'idle' | 'syncing' | 'offline' | 'error'; pending: number; lastSyncedAt?: string; error?: string };
export const useSyncStatus = create<SyncState>(() => ({ status: 'device', pending: 0 }));

let activeSync: Promise<void> | null = null;
let syncSession: { owner: string; controller: AbortController } | null = null;
let stopCurrentSync: (() => void) | undefined;
export function stopCloudSync() { stopCurrentSync?.(); stopCurrentSync = undefined; }

export async function syncNow() {
  const session = syncSession;
  if (!session || session.controller.signal.aborted) return;
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
        applyRemoteChanges(changes);
        if (changes.length) {
          cursor = Math.max(...changes.map((change) => change.seq));
          await writeSyncCursor(cursor, session.owner);
        }
        if (changes.length < 1000) break;
      }
      const pending = (await readOutbox(session.owner)).length;
      if (!current()) return;
      useSyncStatus.setState({ status: 'idle', pending, lastSyncedAt: nowIso(), error: undefined });
    } catch (error) {
      const pending = (await readOutbox(session.owner)).length;
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
  useSyncStatus.setState({ status: 'syncing', pending: 0, lastSyncedAt: undefined, error: undefined });
  const stopWatching = watchStoresForSync();
  const onOnline = () => void syncNow();
  const onVisibility = () => { if (document.visibilityState === 'visible') void syncNow(); };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisibility);
  const timer = window.setInterval(() => void syncNow(), 60_000);
  void syncNow();
  const stop = () => { session.controller.abort(); if (syncSession === session) { syncSession = null; activeSync = null; useSyncStatus.setState({ status: 'device', pending: 0, lastSyncedAt: undefined, error: undefined }); } stopWatching(); window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisibility); window.clearInterval(timer); };
  stopCurrentSync = stop;
  return stop;
}

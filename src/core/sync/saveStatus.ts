import type { SyncState } from './engine';

export function saveStatus(state: SyncState) {
  if (state.localError) return 'Backup needed';
  if (state.status === 'error') return 'Couldn’t save';
  if (state.writing) return 'Saving on this device…';
  if (state.status === 'offline') return 'Offline · saved on this device';
  if (state.conflicts) return 'Changes need review';
  if (state.pending || state.status === 'syncing' || !state.lastSyncedAt) return 'Saving…';
  return 'Saved';
}

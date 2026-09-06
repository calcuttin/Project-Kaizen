import { config } from './config';
import { useSyncStatus } from './sync/engine';

/** Deliberate allowlist: no record contents, raw errors, identifiers, tokens or URLs. */
export function supportReport(issue: 'manual' | 'render-failure' = 'manual') {
  const state = useSyncStatus.getState();
  return { app: 'Project Kaizen', reportVersion: 1, createdAt: new Date().toISOString(), issue, mode: config.mode, online: navigator.onLine, saveState: state.status, pendingChanges: state.pending, conflicts: state.conflicts, localStorageError: Boolean(state.localError), lastSavedAt: state.lastSyncedAt ?? null };
}
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

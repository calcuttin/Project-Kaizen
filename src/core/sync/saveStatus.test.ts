import { expect, it } from 'vitest';
import { saveStatus } from './saveStatus';
import type { SyncState } from './engine';
it('only says Saved after confirmation with no writes, pending edits, conflicts or errors', () => {
  const saved: SyncState = { status: 'idle', pending: 0, writing: 0, conflicts: 0, lastSyncedAt: '2026-09-06T00:00:00Z' };
  expect(saveStatus(saved)).toBe('Saved');
  for (const change of [{ writing: 1 }, { pending: 1 }, { conflicts: 1 }, { lastSyncedAt: undefined }, { status: 'offline' as const }, { status: 'error' as const }, { localError: true }]) expect(saveStatus({ ...saved, ...change })).not.toBe('Saved');
});

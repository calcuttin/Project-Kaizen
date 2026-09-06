import { describe, expect, it } from 'vitest';
import { planConflictResolution } from './conflicts';
import type { SyncConflict } from './types';

const conflict: SyncConflict = { id: 'c1', entityType: 'books', entityId: 'b1', local: { notes: 'device' }, remote: { notes: 'cloud' }, remoteRevision: 4, detectedAt: '2026-01-01T00:00:00.000Z' };

describe('conflict resolution', () => {
  it('rebases a chosen local version onto the remote revision', () => {
    expect(planConflictResolution(conflict, 'local')).toMatchObject({ kind: 'push', mutation: { baseRevision: 4, payload: { notes: 'device' } } });
  });

  it('applies the chosen cloud version at its accepted revision', () => {
    expect(planConflictResolution(conflict, 'remote')).toMatchObject({ kind: 'apply', change: { revision: 4, payload: { notes: 'cloud' } } });
  });
});

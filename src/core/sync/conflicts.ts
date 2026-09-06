import type { RemoteChange, SyncConflict, SyncOperation } from './types';

export type ConflictResolution =
  | { kind: 'push'; mutation: Omit<SyncOperation, 'mutationId' | 'occurredAt'> }
  | { kind: 'apply'; change: RemoteChange };

export function planConflictResolution(conflict: SyncConflict, choice: 'local' | 'remote'): ConflictResolution {
  if (choice === 'local') return { kind: 'push', mutation: { entityType: conflict.entityType, entityId: conflict.entityId, operation: 'put', baseRevision: conflict.remoteRevision, payload: conflict.local } };
  return { kind: 'apply', change: { seq: 0, entity_type: conflict.entityType, entity_id: conflict.entityId, operation: 'put', payload: conflict.remote as Record<string, unknown>, revision: conflict.remoteRevision ?? 1, changed_at: conflict.detectedAt } };
}

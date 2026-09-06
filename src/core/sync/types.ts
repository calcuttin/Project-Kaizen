export type SyncOperation = {
  mutationId: string;
  entityType: string;
  entityId: string;
  operation: 'put' | 'delete';
  baseRevision?: number;
  payload?: unknown;
  occurredAt: string;
};

export type RemoteChange = {
  seq: number;
  entity_type: string;
  entity_id: string;
  operation: 'put' | 'delete';
  payload: Record<string, unknown> | null;
  revision: number;
  changed_at: string;
};

export type SyncConflict = {
  id: string;
  entityType: string;
  entityId: string;
  local: unknown;
  remote: unknown;
  remoteRevision?: number;
  detectedAt: string;
};

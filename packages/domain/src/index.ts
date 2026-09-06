export type DeploymentMode = 'device' | 'cloud';

export interface EntityMetadata {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  revision?: number;
  source?: string;
  sourceRef?: string;
}

export type Query<T> = { where?: Partial<T>; limit?: number; includeDeleted?: boolean };

export interface EntityRepository<T extends EntityMetadata> {
  list(query?: Query<T>): Promise<T[]>;
  get(id: string): Promise<T | null>;
  put(entity: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SyncOperation {
  mutationId: string;
  entityType: string;
  entityId: string;
  operation: 'put' | 'delete';
  baseRevision?: number;
  payload?: unknown;
  occurredAt: string;
}

export type ImportChoices = Record<string, unknown>;
export type ImportResult = { created: number; skipped: number; warnings: string[] };

export interface ImportAdapter<TPreview> {
  id: string;
  label: string;
  accept: string[];
  preview(file: File): Promise<TPreview>;
  commit(preview: TPreview, choices: ImportChoices): Promise<ImportResult>;
}

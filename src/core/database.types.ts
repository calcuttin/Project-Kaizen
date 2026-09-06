// Migration SHA-256: c237dcc9301eeb1b8794a0bcd486f0839b718bd831476d8d5b34c68ef62414a0
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type EntityRow = { owner_id: string; space_id: string | null; id: string; payload: Json; revision: number; source: string | null; source_ref: string | null; created_at: string; updated_at: string; deleted_at: string | null };
type EntityInsert = Partial<Omit<EntityRow, 'owner_id' | 'id'>> & Pick<EntityRow, 'owner_id' | 'id'>;
type EntityTable = { Row: EntityRow; Insert: EntityInsert; Update: Partial<EntityInsert>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: { Row: { owner_id: string; display_name: string | null; avatar_url: string | null; default_space_id: string | null; preferences: Json; created_at: string; updated_at: string }; Insert: { owner_id: string; display_name?: string | null; avatar_url?: string | null; default_space_id?: string | null; preferences?: Json }; Update: { display_name?: string | null; avatar_url?: string | null; default_space_id?: string | null; preferences?: Json }; Relationships: [] };
      projects: EntityTable; tasks: EntityTable; subtasks: EntityTable; day_entries: EntityTable; day_wins: EntityTable;
      channels: EntityTable; content_pieces: EntityTable; metric_snapshots: EntityTable; habits: EntityTable; habit_logs: EntityTable;
      health_goals: EntityTable; shelves: EntityTable; books: EntityTable; reading_sessions: EntityTable; reading_annotations: EntityTable;
      reading_goals: EntityTable; feed_sources: EntityTable; feed_items: EntityTable; import_runs: EntityTable; import_items: EntityTable;
      integration_accounts: EntityTable;
      sync_mutations: { Row: { owner_id: string; mutation_id: string; device_id: string; entity_type: string; entity_id: string; result: Json; accepted_at: string }; Insert: { owner_id: string; mutation_id: string; device_id: string; entity_type: string; entity_id: string; result: Json; accepted_at?: string }; Update: Partial<{ device_id: string; result: Json }>; Relationships: [] };
      change_log: { Row: { seq: number; owner_id: string; entity_type: string; entity_id: string; operation: string; payload: Json | null; revision: number; changed_at: string }; Insert: { owner_id: string; entity_type: string; entity_id: string; operation: string; payload?: Json | null; revision: number; changed_at?: string }; Update: never; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      push_changes: { Args: { p_device_id: string; p_mutations: Json }; Returns: Json };
      pull_changes: { Args: { p_after_seq?: number }; Returns: { seq: number; entity_type: string; entity_id: string; operation: string; payload: Json; revision: number; changed_at: string }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

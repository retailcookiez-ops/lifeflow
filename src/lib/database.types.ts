export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type ProfileRow = { id: string; display_name: string; timezone: string; created_at: string };
export type TaskRow = { id: string; user_id: string; title: string; description: string | null; status: 'open' | 'completed'; priority: 'low' | 'medium' | 'high'; due_at: string | null; completed_at: string | null; created_at: string; updated_at: string; import_source_id: string | null };
export type HabitRow = { id: string; user_id: string; name: string; description: string | null; schedule_days: number[]; is_active: boolean; created_at: string; created_on: string; schedule_history: Json; import_source_id: string | null };
export type CompletionRow = { id: string; habit_id: string; user_id: string; completed_on: string; created_at: string };
type Table<Row, Required extends keyof Row> = { Row: Row; Insert: Pick<Row, Required> & Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = { public: {
  Tables: {
    profiles: Table<ProfileRow, 'id'>;
    local_import_records: Table<{ user_id: string; kind: 'task' | 'habit'; source_id: string; created_at: string }, 'user_id' | 'kind' | 'source_id'>;
    tasks: Table<TaskRow, 'user_id' | 'title'>;
    habits: Table<HabitRow, 'user_id' | 'name' | 'schedule_days' | 'schedule_history'>;
    habit_completions: Table<CompletionRow, 'habit_id' | 'user_id' | 'completed_on'>;
  };
  Views: Record<string, never>;
  Functions: { import_local_data: { Args: { payload: Json }; Returns: Json } };
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
} };

import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseTasks, type Task } from '@/utils/tasks';
import { parseHabits, type Habit } from '@/utils/habits';
import { getSupabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

export type LocalData = { tasks: Task[]; habits: Habit[] };
/** Read only: never rewrite or delete the original local keys, including on import failure. */
export async function readLocalData(): Promise<LocalData> {
  const [tasks, habits] = await Promise.all([
    AsyncStorage.getItem('lifeflow.tasks.v1'), AsyncStorage.getItem('lifeflow.habits.v1'),
  ]);
  try { return { tasks: parseTasks(tasks), habits: parseHabits(habits) }; }
  catch { throw new Error('Local data could not be validated. It has been left untouched. Do not clear app storage; recover a backup before importing.'); }
}
export async function importLocalData(): Promise<{ tasks: number; habits: number }> {
  // Re-read immediately before import so the preview is never treated as authoritative.
  const payload = await readLocalData();
  const { data, error } = await getSupabase().rpc('import_local_data', { payload: payload as unknown as Json });
  if (error) throw error;
  const result = data as { tasks?: unknown; habits?: unknown } | null;
  if (!result || typeof result.tasks !== 'number' || typeof result.habits !== 'number') throw new Error('Import response unavailable. Retrying is safe.');
  return { tasks: result.tasks, habits: result.habits };
}

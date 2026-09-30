import { getSupabase } from '@/lib/supabase';
import { readAllRows } from './pagination';
import type { CompletionRow, HabitRow, TaskRow } from '@/lib/database.types';
import { parseTasks, validFields, type Task, type TaskFields } from '@/utils/tasks';
import { newHabit, parseHabits, scheduledOn, updateHabit, validHabitFields, type Habit, type HabitFields } from '@/utils/habits';
import { localDate } from '@/utils/tasks';

export function taskFromRow(row: TaskRow): Task {
  return parseTasks(JSON.stringify([{ id: row.id, title: row.title, done: row.status === 'completed',
    priority: row.priority, dueDate: row.due_at?.slice(0,10) ?? null }]))[0];
}
export function habitFromRow(row: HabitRow, completions: CompletionRow[]): Habit {
  return parseHabits(JSON.stringify({ version: 1, habits: [{ id: row.id, title: row.name, createdOn: row.created_on,
    schedules: row.schedule_history, completions: completions.filter(c => c.habit_id === row.id).map(c => c.completed_on) }] }))[0];
}
const dueAt = (date: string | null) => date ? `${date}T12:00:00.000Z` : null;
function validateTask(fields: TaskFields) { if (!validFields(fields)) throw new Error('Enter a task title, valid due date and priority.'); }
function validateHabit(fields: HabitFields) { if (!validHabitFields(fields)) throw new Error('Enter a habit name and choose at least one weekday.'); }

export async function fetchTasks(userId: string): Promise<Task[]> {
  const data = await readAllRows<TaskRow>((from, to) => getSupabase().from('tasks').select('*').eq('user_id', userId).order('created_at').order('id').range(from, to));
  return data.map(taskFromRow);
}
export async function createTask(userId: string, fields: TaskFields) {
  validateTask(fields);
  const { error } = await getSupabase().from('tasks').insert({ user_id: userId, title: fields.title.trim(), priority: fields.priority, due_at: dueAt(fields.dueDate) });
  if (error) throw error;
}
export async function editTask(userId: string, id: string, fields: TaskFields) {
  validateTask(fields);
  const { data, error } = await getSupabase().from('tasks').update({ title: fields.title.trim(), priority: fields.priority, due_at: dueAt(fields.dueDate) })
    .eq('user_id', userId).eq('id', id).select('id').single();
  if (error || !data) throw error ?? new Error('Task no longer exists. Refresh and try again.');
}
export async function completeTask(userId: string, task: Task) {
  const { data, error } = await getSupabase().from('tasks').update({ status: task.done ? 'open' : 'completed', completed_at: task.done ? null : new Date().toISOString() })
    .eq('user_id', userId).eq('id', task.id).select('id').single();
  if (error || !data) throw error ?? new Error('Task no longer exists. Refresh and try again.');
}
export async function deleteTask(userId: string, id: string) {
  const { error } = await getSupabase().from('tasks').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
export async function fetchHabits(userId: string): Promise<Habit[]> {
  const client = getSupabase();
  const [habits, completions] = await Promise.all([
    readAllRows<HabitRow>((from, to) => client.from('habits').select('*').eq('user_id', userId).eq('is_active', true).order('created_at').order('id').range(from, to)),
    readAllRows<CompletionRow>((from, to) => client.from('habit_completions').select('*').eq('user_id', userId).order('id').range(from, to)),
  ]);
  return habits.map(row => habitFromRow(row, completions));
}
export async function createHabit(userId: string, fields: HabitFields) {
  validateHabit(fields);
  const habit = newHabit('', fields, localDate());
  const { error } = await getSupabase().from('habits').insert({ user_id: userId, name: habit.title,
    schedule_days: habit.schedules[0].weekdays, created_on: habit.createdOn, schedule_history: habit.schedules });
  if (error) throw error;
}
export async function editHabit(userId: string, id: string, fields: HabitFields) {
  validateHabit(fields);
  // Read fresh history so another device's past schedule edits are not replaced by a stale view.
  const client = getSupabase();
  const result = await client.from('habits').select('*').eq('user_id', userId).eq('id', id).single();
  if (result.error) throw result.error;
  const next = updateHabit(habitFromRow(result.data, []), fields, localDate());
  const { data, error } = await client.from('habits').update({ name: next.title, schedule_days: next.schedules[next.schedules.length - 1].weekdays, schedule_history: next.schedules })
    .eq('user_id', userId).eq('id', id).select('id').single();
  if (error || !data) throw error ?? new Error('Habit no longer exists. Refresh and try again.');
}
export async function deleteHabit(userId: string, id: string) {
  const { error } = await getSupabase().from('habits').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
export async function completeHabit(userId: string, habit: Habit, today: string) {
  if (!scheduledOn(habit, today)) throw new Error('This habit is not scheduled today.');
  const client = getSupabase();
  if (habit.completions.includes(today)) {
    const { error } = await client.from('habit_completions').delete().eq('user_id', userId).eq('habit_id', habit.id).eq('completed_on', today);
    if (error) throw error;
  } else {
    const { error } = await client.from('habit_completions').upsert({ habit_id: habit.id, user_id: userId, completed_on: today }, { onConflict: 'habit_id,completed_on', ignoreDuplicates: true });
    if (error) throw error;
  }
}

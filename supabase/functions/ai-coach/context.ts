export type CoachContext = {
  today: string; timezone: string; displayName: string; goals: string[]; wakeTime: string | null; sleepTime: string | null;
  tasks: { title: string; completed: boolean; priority: string; dueDate: string | null }[];
  habits: { name: string; completedToday: boolean }[]; truncated: boolean;
};
type Profile = { display_name: string; goals: string[]; wake_time: string | null; sleep_time: string | null };
type Task = { title: string; status: string; priority: string; due_at: string | null };
type Habit = { id: string; name: string };
export function localDay(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
/** Allowlists only: never spread a database record into model context. */
export function minimizeContext(today: string, timezone: string, profile: Profile, tasks: Task[], habits: Habit[], completionIds: string[]): CoachContext {
  return {
    today, timezone, displayName: profile.display_name.slice(0, 80), goals: profile.goals.slice(0, 5),
    wakeTime: profile.wake_time?.slice(0, 5) ?? null, sleepTime: profile.sleep_time?.slice(0, 5) ?? null,
    tasks: tasks.slice(0, 12).map(task => ({ title: task.title.slice(0, 160), completed: task.status === 'completed', priority: task.priority, dueDate: task.due_at?.slice(0, 10) ?? null })),
    habits: habits.slice(0, 12).map(habit => ({ name: habit.name.slice(0, 160), completedToday: completionIds.includes(habit.id) })),
    truncated: tasks.length > 12 || habits.length > 12,
  };
}

export const GOALS = [
  { value: 'productivity', label: 'Productivity' }, { value: 'fitness', label: 'Fitness' },
  { value: 'studying', label: 'Studying' }, { value: 'consistency', label: 'Consistency' },
  { value: 'self-improvement', label: 'General self-improvement' },
] as const;
export const MODULES = [{ value: 'tasks', label: 'Tasks' }, { value: 'habits', label: 'Habits' }] as const;
export type Goal = typeof GOALS[number]['value'];
export type Module = typeof MODULES[number]['value'];
export type ProfileFields = { displayName: string; goals: Goal[]; modules: Module[]; timezone: string; wakeTime: string; sleepTime: string; weekStart: 0 | 1 };
export function validTimezone(value: string): boolean {
  if (!value.trim() || value.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value.trim() }).format(); return true; } catch { return false; }
}
export function validateProfile(fields: ProfileFields): string | null {
  if (fields.displayName.trim().length > 80) return 'Keep your display name to 80 characters or fewer.';
  if (!validTimezone(fields.timezone)) return 'Enter a valid timezone, such as Europe/Zurich.';
  for (const [label, time] of [['Wake time', fields.wakeTime], ['Sleep time', fields.sleepTime]]) {
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return `${label} must use 24-hour HH:MM, such as 07:30, or be left blank.`;
  }
  if (fields.weekStart !== 0 && fields.weekStart !== 1) return 'Choose Monday or Sunday as your week start.';
  if (fields.goals.length > 5 || fields.goals.some(value => !GOALS.some(goal => goal.value === value))) return 'Choose goals from the available options.';
  if (fields.modules.length > 2 || fields.modules.some(value => !MODULES.some(module => module.value === value))) return 'Choose Tasks, Habits, or both.';
  return null;
}

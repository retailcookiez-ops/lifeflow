import { isValidDate, localDate } from './tasks';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type HabitFields = { title: string; weekdays: Weekday[] };
export type Habit = {
  id: string;
  title: string;
  createdOn: string;
  schedules: { from: string; weekdays: Weekday[] }[];
  completions: string[];
};

export function dateObject(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}
export function shiftDate(day: string, amount: number): string {
  const date = dateObject(day);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}
export function weekDates(today: string, offset = 0, weekStart: 0 | 1 = 1): string[] {
  const weekday = dateObject(today).getDay();
  const start = shiftDate(today, -((weekday - weekStart + 7) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
}
export function validWeekdays(value: unknown): value is Weekday[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 7 &&
    value.every(day => Number.isInteger(day) && day >= 0 && day <= 6) && new Set(value).size === value.length;
}
export function validHabitFields(fields: HabitFields): boolean {
  return !!fields.title.trim() && fields.title.trim().length <= 200 && validWeekdays(fields.weekdays);
}
export function weekdaysOn(habit: Habit, day: string): Weekday[] {
  let result: Weekday[] = [];
  for (const schedule of habit.schedules) {
    if (schedule.from > day) break;
    result = schedule.weekdays;
  }
  return result;
}
export function scheduledOn(habit: Habit, day: string): boolean {
  return day >= habit.createdOn && weekdaysOn(habit, day).includes(dateObject(day).getDay() as Weekday);
}
export function newHabit(id: string, fields: HabitFields, today: string): Habit {
  return { id, title: fields.title.trim(), createdOn: today,
    schedules: [{ from: today, weekdays: [...fields.weekdays].sort() }], completions: [] };
}
export function updateHabit(habit: Habit, fields: HabitFields, today: string): Habit {
  const weekdays = [...fields.weekdays].sort();
  const previous = weekdaysOn(habit, today);
  if (previous.length === weekdays.length && previous.every(day => weekdays.includes(day))) {
    return { ...habit, title: fields.title.trim() };
  }
  // Replace today's version, preserve earlier versions and all check-in records.
  return { ...habit, title: fields.title.trim(),
    schedules: [...habit.schedules.filter(schedule => schedule.from < today), { from: today, weekdays }] };
}
export function toggleHabit(habit: Habit, today: string): Habit {
  if (!scheduledOn(habit, today)) return habit;
  return { ...habit, completions: habit.completions.includes(today)
    ? habit.completions.filter(day => day !== today) : [...habit.completions, today].sort() };
}
export function habitProgress(habits: Habit[], today: string) {
  const scheduled = habits.filter(habit => scheduledOn(habit, today));
  const done = scheduled.filter(habit => habit.completions.includes(today)).length;
  return { done, total: scheduled.length, percentage: scheduled.length ? Math.round(done / scheduled.length * 100) : 0 };
}
export function consistency(habit: Habit, today: string) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(today, i - 6)).filter(day => scheduledOn(habit, day));
  const done = days.filter(day => habit.completions.includes(day)).length;
  return { done, total: days.length, percentage: days.length ? Math.round(done / days.length * 100) : null };
}
export type DayStatus = 'complete' | 'missed' | 'pending' | 'future' | 'off';
export function dayStatus(habit: Habit, day: string, today: string): DayStatus {
  if (!scheduledOn(habit, day)) return 'off';
  if (day > today) return 'future';
  if (habit.completions.includes(day)) return 'complete';
  return day === today ? 'pending' : 'missed';
}
export function parseHabits(raw: string | null): Habit[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('Invalid habit data');
  const envelope = data as Record<string, unknown>;
  if (envelope.version !== 1 || !Array.isArray(envelope.habits)) throw new Error('Invalid habit data');
  const ids = new Set<string>();
  return envelope.habits.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid habit');
    const h = value as Record<string, unknown>;
    if (typeof h.id !== 'string' || !h.id || ids.has(h.id) || typeof h.title !== 'string' ||
        !h.title.trim() || h.title.trim().length > 200 || typeof h.createdOn !== 'string' || !isValidDate(h.createdOn) ||
        !Array.isArray(h.schedules) || h.schedules.length === 0 || !Array.isArray(h.completions)) throw new Error('Invalid habit');
    const createdOn = h.createdOn;
    let previous = '';
    const schedules = h.schedules.map((value: unknown) => {
      if (!value || typeof value !== 'object') throw new Error('Invalid schedule');
      const s = value as Record<string, unknown>;
      if (typeof s.from !== 'string' || !isValidDate(s.from) || s.from < createdOn || s.from <= previous || !validWeekdays(s.weekdays)) throw new Error('Invalid schedule');
      previous = s.from;
      return { from: s.from, weekdays: [...s.weekdays].sort() };
    });
    if (schedules[0].from !== createdOn) throw new Error('Invalid schedule start');
    const completions = h.completions.map((day: unknown) => {
      if (typeof day !== 'string' || !isValidDate(day) || day < createdOn) throw new Error('Invalid completion');
      return day;
    });
    if (new Set(completions).size !== completions.length) throw new Error('Duplicate completion');
    ids.add(h.id);
    return { id: h.id, title: h.title.trim(), createdOn, schedules, completions: completions.sort() };
  });
}
export function serializeHabits(habits: Habit[]): string {
  return JSON.stringify({ version: 1, habits });
}

import { scheduledOn, shiftDate, type Habit } from './habits';
/** Consecutive scheduled completions; an unfinished today does not break yesterday's streak. */
export function habitStreak(habit: Habit, today: string): number {
  if (!habit.completions.length) return 0;
  const completed = new Set(habit.completions); let count = 0;
  for (let day = today; day >= habit.createdOn; day = shiftDate(day, -1)) {
    if (!scheduledOn(habit, day)) continue;
    if (completed.has(day)) count++;
    else if (day !== today) break;
  }
  return count;
}

import type { Task } from './tasks';
export function dashboardTasks(tasks: Task[], today: string) {
  // Include completed tasks in the same due-date cohort so checking a box advances progress.
  const todayTasks = tasks.filter(task => task.dueDate === null || task.dueDate <= today);
  const done = todayTasks.filter(task => task.done).length;
  const upcoming = tasks.filter(task => !task.done && task.dueDate !== null && task.dueDate > today)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) ||
      ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).slice(0, 3);
  return { done, total: todayTasks.length, percentage: todayTasks.length ? Math.round(done / todayTasks.length * 100) : 0, upcoming };
}

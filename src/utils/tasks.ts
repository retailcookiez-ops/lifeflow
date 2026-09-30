export type Priority = 'low' | 'medium' | 'high';
export type TaskFields = { title: string; dueDate: string | null; priority: Priority };
export type Task = TaskFields & { id: string; done: boolean };
export type TaskFilter = 'Today' | 'Upcoming' | 'Completed' | 'All';
export type TaskSort = 'dueDate' | 'priority';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || year > 9999) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
export function validFields(fields: TaskFields): boolean {
  return !!fields.title.trim() && fields.title.trim().length <= 200 &&
    ['low', 'medium', 'high'].includes(fields.priority) &&
    (fields.dueDate === null || isValidDate(fields.dueDate));
}
export function parseTasks(raw: string | null): Task[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Invalid task data');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid task');
    const t = item as Record<string, unknown>;
    const fields = { title: typeof t.title === 'string' ? t.title.trim() : '',
      dueDate: t.dueDate === undefined ? null : t.dueDate,
      priority: t.priority === undefined ? 'medium' : t.priority };
    if (typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.done !== 'boolean' ||
        (fields.dueDate !== null && typeof fields.dueDate !== 'string') ||
        !validFields(fields as TaskFields)) throw new Error('Invalid task');
    ids.add(t.id);
    return { ...fields, id: t.id, done: t.done } as Task;
  });
}
const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
export function selectTasks(tasks: Task[], filter: TaskFilter, sort: TaskSort, today: string): Task[] {
  const byDate = (a: Task, b: Task) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99');
  const byPriority = (a: Task, b: Task) => rank[a.priority] - rank[b.priority];
  return tasks.filter(task => {
    if (filter === 'All') return true;
    if (filter === 'Completed') return task.done;
    if (task.done) return false;
    if (filter === 'Upcoming') return task.dueDate !== null && task.dueDate > today;
    return task.dueDate === null || task.dueDate <= today;
  }).sort((a, b) => sort === 'dueDate' ? byDate(a, b) || byPriority(a, b) : byPriority(a, b) || byDate(a, b));
}

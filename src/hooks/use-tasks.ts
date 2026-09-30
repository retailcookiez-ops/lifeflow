import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Task = { id: string; title: string; done: boolean };
const STORAGE_KEY = 'lifeflow.tasks.v1';

function parseTasks(raw: string | null): Task[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Invalid task data');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid task');
    const task = item as Record<string, unknown>;
    if (typeof task.id !== 'string' || !task.id || ids.has(task.id) ||
        typeof task.title !== 'string' || !task.title.trim() || typeof task.done !== 'boolean') {
      throw new Error('Invalid task');
    }
    ids.add(task.id);
    return { id: task.id, title: task.title.trim(), done: task.done };
  });
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);

  const load = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      const saved = parseTasks(await AsyncStorage.getItem(STORAGE_KEY));
      setTasks(saved);
      setReady(true);
    } catch {
      setError('Could not load saved tasks. Retry to keep your saved data safe.');
    }
  }, []);

  // Loading status synchronizes the UI with the external storage request.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!ready) return;
    const current = ++revision.current;
    // Saving status synchronizes the UI with the external storage queue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaving(true);
    // Serialize writes so a slower older save cannot overwrite the latest tasks.
    queue.current = queue.current.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        if (revision.current === current) setError(null);
      } catch {
        if (revision.current === current) setError('Tasks changed, but could not be saved. Please retry before closing.');
      } finally {
        if (revision.current === current) setSaving(false);
      }
    });
  }, [tasks, ready, retry]);

  function addTask(title: string) {
    if (!ready || !title.trim()) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTasks(old => [...old, { id, title: title.trim(), done: false }]);
  }
  function editTask(id: string, title: string) {
    if (!ready || !title.trim()) return;
    setTasks(old => old.map(task => task.id === id ? { ...task, title: title.trim() } : task));
  }
  function deleteTask(id: string) {
    if (ready) setTasks(old => old.filter(task => task.id !== id));
  }
  function toggleTask(id: string) {
    if (ready) setTasks(old => old.map(task => task.id === id ? { ...task, done: !task.done } : task));
  }
  return { tasks, ready, error, saving, addTask, editTask, deleteTask, toggleTask,
    retry: () => ready ? setRetry(old => old + 1) : void load() };
}

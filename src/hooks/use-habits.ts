import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalDay } from '@/hooks/use-local-day';
import { localDate } from '@/utils/tasks';
import { habitProgress, newHabit, parseHabits, serializeHabits, toggleHabit, updateHabit, validHabitFields, type Habit, type HabitFields } from '@/utils/habits';

const STORAGE_KEY = 'lifeflow.habits.v1';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const today = useLocalDay();
  const load = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      const saved = parseHabits(await AsyncStorage.getItem(STORAGE_KEY));
      setHabits(saved);
      setReady(true);
    } catch {
      setError('Could not load habits and history. Retry to keep your saved data safe.');
    }
  }, []);
  // Loading status synchronizes the UI with external storage.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!ready) return;
    const current = ++revision.current;
    // Saving status synchronizes the UI with the external storage queue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaving(true);
    // Store habits, schedules and completions together; serialize writes to prevent older saves winning.
    queue.current = queue.current.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, serializeHabits(habits));
        if (revision.current === current) setError(null);
      } catch {
        if (revision.current === current) setError('Habit changes could not be saved. Retry before closing the app.');
      } finally {
        if (revision.current === current) setSaving(false);
      }
    });
  }, [habits, ready, retryCount]);
  function addHabit(fields: HabitFields) {
    if (!ready || !validHabitFields(fields)) return;
    const habit = newHabit(`${Date.now()}-${Math.random().toString(36).slice(2)}`, fields, localDate());
    setHabits(old => [...old, habit]);
  }
  function editHabit(id: string, fields: HabitFields) {
    if (!ready || !validHabitFields(fields)) return;
    const day = localDate();
    setHabits(old => old.map(habit => habit.id === id ? updateHabit(habit, fields, day) : habit));
  }
  function deleteHabit(id: string) {
    if (ready) setHabits(old => old.filter(habit => habit.id !== id));
  }
  function toggleToday(id: string) {
    if (!ready) return;
    const day = localDate();
    setHabits(old => old.map(habit => habit.id === id ? toggleHabit(habit, day) : habit));
  }
  return { habits, ready, error, saving, today, progress: habitProgress(habits, today),
    addHabit, editHabit, deleteHabit, toggleToday,
    retry: () => ready ? setRetryCount(old => old + 1) : void load() };
}

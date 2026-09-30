import { useCallback } from 'react';
import { useCloudCollection } from './use-cloud-collection';
import { useLocalDay } from './use-local-day';
import * as cloud from '@/services/cloud-data';
import { habitProgress, type HabitFields } from '@/utils/habits';
import { localDate } from '@/utils/tasks';
export function useCloudHabits(userId: string) {
  const fetchRows = useCallback(() => cloud.fetchHabits(userId), [userId]);
  const state = useCloudCollection(fetchRows);
  const today = useLocalDay();
  return { ...state, habits: state.rows, today, progress: habitProgress(state.rows, today),
    addHabit: (fields: HabitFields) => state.mutate(() => cloud.createHabit(userId, fields)),
    editHabit: (id: string, fields: HabitFields) => state.mutate(() => cloud.editHabit(userId, id, fields)),
    deleteHabit: (id: string) => state.mutate(() => cloud.deleteHabit(userId, id)),
    toggleToday: (id: string) => state.mutate(async () => {
      const habit = state.rows.find(h => h.id === id);
      if (!habit) throw new Error('Habit no longer exists. Refresh and try again.');
      await cloud.completeHabit(userId, habit, localDate());
    }),
    retry: () => { if (!state.saving) void state.reload(); },
  };
}

import { useCallback } from 'react';
import { useCloudCollection } from './use-cloud-collection';
import * as cloud from '@/services/cloud-data';
import type { TaskFields } from '@/utils/tasks';
export function useCloudTasks(userId: string) {
  const fetchRows = useCallback(() => cloud.fetchTasks(userId), [userId]);
  const state = useCloudCollection(fetchRows);
  return { ...state, tasks: state.rows,
    addTask: (fields: TaskFields) => state.mutate(() => cloud.createTask(userId, fields)),
    editTask: (id: string, fields: TaskFields) => state.mutate(() => cloud.editTask(userId, id, fields)),
    deleteTask: (id: string) => state.mutate(() => cloud.deleteTask(userId, id)),
    toggleTask: (id: string) => state.mutate(async () => {
      const task = state.rows.find(t => t.id === id);
      if (!task) throw new Error('Task no longer exists. Refresh and try again.');
      await cloud.completeTask(userId, task);
    }),
    retry: () => { if (!state.saving) void state.reload(); },
  };
}

import { createContext, useContext, type ReactNode } from 'react';
import { useCloudTasks } from '@/hooks/use-cloud-tasks';
import { useCloudHabits } from '@/hooks/use-cloud-habits';


type LifeFlowState = { taskSystem: ReturnType<typeof useCloudTasks>; habitSystem: ReturnType<typeof useCloudHabits> };
const LifeFlowContext = createContext<LifeFlowState | null>(null);

/** One storage owner per dataset; switching routes never loads competing copies. */
export function LifeFlowProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const taskSystem = useCloudTasks(userId);
  const habitSystem = useCloudHabits(userId);
  return <LifeFlowContext.Provider value={{ taskSystem, habitSystem }}>{children}</LifeFlowContext.Provider>;
}
export function useLifeFlow() {
  const state = useContext(LifeFlowContext);
  if (!state) throw new Error('LifeFlow screens require LifeFlowProvider');
  return state;
}

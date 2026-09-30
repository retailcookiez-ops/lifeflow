import { createContext, useContext, type ReactNode } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { useHabits } from '@/hooks/use-habits';

type LifeFlowState = { taskSystem: ReturnType<typeof useTasks>; habitSystem: ReturnType<typeof useHabits> };
const LifeFlowContext = createContext<LifeFlowState | null>(null);

/** One storage owner per dataset; switching routes never loads competing copies. */
export function LifeFlowProvider({ children }: { children: ReactNode }) {
  const taskSystem = useTasks();
  const habitSystem = useHabits();
  return <LifeFlowContext.Provider value={{ taskSystem, habitSystem }}>{children}</LifeFlowContext.Provider>;
}
export function useLifeFlow() {
  const state = useContext(LifeFlowContext);
  if (!state) throw new Error('LifeFlow screens require LifeFlowProvider');
  return state;
}

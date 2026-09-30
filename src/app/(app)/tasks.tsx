import { View } from 'react-native';
import { LifeFlowScreen, screenStyles } from '@/components/lifeflow-screen';
import { TaskPanel } from '@/components/task-panel';
import { useLifeFlow } from '@/providers/lifeflow-provider';
export default function TasksScreen() {
  const { taskSystem } = useLifeFlow();
  return <LifeFlowScreen title="Tasks" eyebrow="PLAN YOUR DAY" subtitle="Make room for what matters.">
    <View style={screenStyles.card}><TaskPanel system={taskSystem} /></View>
  </LifeFlowScreen>;
}

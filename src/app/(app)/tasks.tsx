import { useThemedStyles } from '@/providers/theme-provider';
import { View } from 'react-native';
import { LifeFlowScreen, screenStyles as basescreenStyles } from '@/components/lifeflow-screen';
import { TaskPanel } from '@/components/task-panel';
import { useLifeFlow } from '@/providers/lifeflow-provider';
export default function TasksScreen() {
  const screenStyles = useThemedStyles(basescreenStyles);
  const { taskSystem } = useLifeFlow();
  return <LifeFlowScreen title="Tasks" eyebrow="PLAN YOUR DAY" subtitle="Make room for what matters.">
    <View style={screenStyles.card}><TaskPanel system={taskSystem} /></View>
  </LifeFlowScreen>;
}

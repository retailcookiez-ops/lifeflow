import { useThemedStyles } from '@/providers/theme-provider';
import { View } from 'react-native';
import { LifeFlowScreen, screenStyles as basescreenStyles } from '@/components/lifeflow-screen';
import { HabitPanel } from '@/components/habit-panel';
import { useLifeFlow } from '@/providers/lifeflow-provider';
export default function HabitsScreen() {
  const screenStyles = useThemedStyles(basescreenStyles);
  const { habitSystem } = useLifeFlow();
  return <LifeFlowScreen title="Habits" eyebrow="BUILD CONSISTENCY" subtitle="Small actions, repeated on your terms.">
    <View style={screenStyles.card}><HabitPanel system={habitSystem} /></View>
  </LifeFlowScreen>;
}

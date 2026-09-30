import { Text, View } from 'react-native';
import { LifeFlowScreen, screenStyles } from '@/components/lifeflow-screen';
import { useLifeFlow } from '@/providers/lifeflow-provider';
export default function SettingsScreen() {
  const { taskSystem, habitSystem } = useLifeFlow();
  return <LifeFlowScreen title="Settings" eyebrow="YOUR LIFEFLOW" subtitle="Your app, your progress.">
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Appearance</Text>
      <Text style={screenStyles.muted}>LifeFlow dark theme</Text>
    </View>
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Local storage</Text>
      <Text style={screenStyles.muted}>Tasks and habits are saved automatically on this browser or device. They remain available after restarting the app.</Text>
      <Text style={[screenStyles.muted, { marginTop: 12 }]}>Tasks: {taskSystem.ready ? taskSystem.tasks.length : 'Loading…'} · Habits: {habitSystem.ready ? habitSystem.habits.length : 'Loading…'}</Text>
      <Text style={[screenStyles.muted, { marginTop: 8 }]}>{taskSystem.error || habitSystem.error ? 'A save or load needs attention. Open Tasks or Habits to retry.' : taskSystem.saving || habitSystem.saving ? 'Saving changes…' : taskSystem.ready && habitSystem.ready ? 'All changes saved.' : 'Loading saved data…'}</Text>
    </View>
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Calendar and history</Text>
      <Text style={screenStyles.muted}>Due dates and daily habit check-ins use your device’s local date. Habit schedule changes apply from today onward, preserving earlier history.</Text>
    </View>
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>About LifeFlow</Text>
      <Text style={screenStyles.muted}>Version 1.0.0 · Small steps. Consistent progress.</Text>
    </View>
  </LifeFlowScreen>;
}

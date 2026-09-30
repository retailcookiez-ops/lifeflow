import { useProfile } from '@/providers/profile-provider';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LifeFlowScreen, screenStyles } from '@/components/lifeflow-screen';
import { useLifeFlow } from '@/providers/lifeflow-provider';
import { dashboardTasks } from '@/utils/dashboard';
import { scheduledOn } from '@/utils/habits';

function SectionLink({ href, label }: { href: '/tasks' | '/habits'; label: string }) {
  return <Link href={href} asChild><Pressable accessibilityRole="link" style={styles.link}>
    <Text style={styles.linkText}>{label} →</Text>
  </Pressable></Link>;
}
function ProgressCard({ label, done, total, percentage, ready, description }: {
  label: string; done: number; total: number; percentage: number; ready: boolean; description: string;
}) {
  return <View style={screenStyles.card}>
    <Text style={styles.eyebrow}>{label}</Text>
    <Text style={styles.percentage}>{ready ? `${percentage}%` : '—'}</Text>
    <Text style={screenStyles.muted}>{ready ? `${done} of ${total} completed` : 'Loading saved data…'}</Text>
    <View style={styles.track}><View style={[styles.fill, { width: `${ready ? percentage : 0}%` }]} /></View>
    <Text style={[screenStyles.muted, { marginTop: 12 }]}>{description}</Text>
  </View>;
}
export default function DashboardScreen() {
  const { taskSystem, habitSystem } = useLifeFlow();
  const { profile } = useProfile();
  const showTasks = profile?.modules.includes('tasks') ?? true;
  const showHabits = profile?.modules.includes('habits') ?? true;
  const { today } = habitSystem;
  const tasks = dashboardTasks(taskSystem.tasks, today);
  const habits = habitSystem.habits.filter(habit => scheduledOn(habit, today));
  return <LifeFlowScreen title="Today" eyebrow="YOUR DASHBOARD" subtitle={profile?.display_name ? `Hello, ${profile.display_name}. Small steps. Consistent progress.` : 'Small steps. Consistent progress.'}>
    {(taskSystem.error || habitSystem.error) && <View style={screenStyles.card}>
      <Text style={styles.error}>{taskSystem.error || habitSystem.error}</Text>
      <SectionLink href={taskSystem.error ? '/tasks' : '/habits'} label="Review and retry" />
    </View>}
    {showTasks && <ProgressCard label="TODAY’S TASK PROGRESS" {...tasks} ready={taskSystem.ready}
      description="Tasks due today or earlier, plus tasks without a due date." />}
    {showHabits && <ProgressCard label="TODAY’S HABIT PROGRESS" {...habitSystem.progress} ready={habitSystem.ready}
      description={habitSystem.ready && habits.length === 0 ? 'No habits scheduled today.' : 'Only habits scheduled for today count.'} />}
    {showTasks && <><View style={styles.sectionHeader}><Text style={screenStyles.section}>Upcoming tasks</Text><SectionLink href="/tasks" label="View all tasks" /></View>
    <View style={screenStyles.card}>
      {!taskSystem.ready ? <Text style={screenStyles.muted}>Loading tasks…</Text> : tasks.upcoming.length === 0 ?
        <Text style={screenStyles.muted}>No upcoming tasks. Plan your next step in Tasks.</Text> : tasks.upcoming.map(task =>
          <View key={task.id} style={styles.row}><Text style={styles.itemTitle}>{task.title}</Text>
            <Text style={screenStyles.muted}>Due {task.dueDate} · {task.priority} priority</Text></View>)}
    </View>
    </>}
    {showHabits && <><View style={styles.sectionHeader}><Text style={screenStyles.section}>Today’s habits</Text><SectionLink href="/habits" label="View all habits" /></View>
    <View style={screenStyles.card}>
      {!habitSystem.ready ? <Text style={screenStyles.muted}>Loading habits…</Text> : habits.length === 0 ?
        <Text style={screenStyles.muted}>No habits scheduled today. Set your routine in Habits.</Text> : habits.slice(0, 3).map(habit =>
          <View key={habit.id} style={styles.row}><Text style={styles.itemTitle}>{habit.title}</Text>
            <Text style={{ color: habit.completions.includes(today) ? '#8BE9C0' : '#9CA8B5' }}>{habit.completions.includes(today) ? '✓ Complete today' : '○ Pending today'}</Text></View>)}
      {habits.length > 3 && <Text style={[screenStyles.muted, { marginTop: 12 }]}>+{habits.length - 3} more scheduled habits</Text>}
    </View>
    </>}
    {!showTasks && !showHabits && <View style={screenStyles.card}><Text style={screenStyles.label}>A little space to focus</Text>
      <Text style={screenStyles.muted}>Your dashboard summaries are hidden. Your tasks and habits are still available in navigation.</Text>
      <Link href="/settings" style={styles.linkText}>Choose dashboard modules in Settings →</Link>
    </View>}
  </LifeFlowScreen>;
}
const styles = StyleSheet.create({
  eyebrow: { color: '#8BE9C0', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  percentage: { color: '#8BE9C0', fontSize: 40, fontWeight: '800', marginTop: 8 },
  track: { height: 7, backgroundColor: '#202A35', borderRadius: 10, overflow: 'hidden', marginTop: 20 },
  fill: { height: '100%', backgroundColor: '#8BE9C0', borderRadius: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  link: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
  linkText: { color: '#8BE9C0', fontSize: 13, fontWeight: '600' },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#28323D', gap: 6 },
  itemTitle: { color: '#F4F7FA', fontSize: 14, fontWeight: '600' },
  error: { color: '#FF9C9C', fontSize: 13, lineHeight: 20 },
});

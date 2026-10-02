import { useState } from 'react';
import { Link } from 'expo-router';
import { ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '@/providers/profile-provider';
import { useLifeFlow } from '@/providers/lifeflow-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { dashboardTasks } from '@/utils/dashboard';
import { scheduledOn } from '@/utils/habits';
import { habitStreak } from '@/utils/streak';
import { Brand } from '@/components/app-navigation';
import { ThemeSwitch } from '@/components/theme-switch';
import { Icon, MountainScene } from '@/components/artwork';
import { Card, CoachPreview, DashboardProgress, ListCard, Stat } from '@/components/dashboard-widgets';
export default function DashboardScreen() {
  const { taskSystem, habitSystem } = useLifeFlow(); const { profile } = useProfile(); const { colors } = useAppTheme();
  const { width } = useWindowDimensions(); const mobile = width < 700; const sidebar = width >= 900; const columns = width >= 1220;
  const [search, setSearch] = useState(''); const [hour] = useState(() => new Date().getHours());
  const { today } = habitSystem; const tasks = dashboardTasks(taskSystem.tasks, today); const habits = habitSystem.habits.filter(habit => scheduledOn(habit, today));
  const showTasks = profile?.modules.includes('tasks') ?? true, showHabits = profile?.modules.includes('habits') ?? true;
  const streak = Math.max(0, ...habitSystem.habits.map(habit => habitStreak(habit, today)));
  const date = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const query = search.trim().toLowerCase();
  const matches = [...taskSystem.tasks.filter(task => task.title.toLowerCase().includes(query)).map(task => ({ id: task.id, title: task.title, href: '/tasks' as const, type: 'Task' })), ...habitSystem.habits.filter(habit => habit.title.toLowerCase().includes(query)).map(habit => ({ id: habit.id, title: habit.title, href: '/habits' as const, type: 'Habit' }))].slice(0, 6);
  const taskList = <ListCard title="Upcoming tasks" icon="calendar" href="/tasks" addLabel="Add a task" empty={taskSystem.ready && tasks.upcoming.length === 0 ? 'No upcoming tasks. Plan your next step.' : undefined}>
    {!taskSystem.ready ? <Text style={{ color: colors.muted }}>Loading tasks…</Text> : tasks.upcoming.map(task => <View key={task.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, gap: 6 }}><Text style={{ color: colors.text, fontWeight: '600' }}>{task.title}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Due {task.dueDate} · {task.priority} priority</Text></View>)}
  </ListCard>;
  const habitList = <ListCard title="Today’s habits" icon="leaf" href="/habits" addLabel="Add a habit" purple empty={habitSystem.ready && habits.length === 0 ? 'No habits scheduled today. Set your routine.' : undefined}>
    {!habitSystem.ready ? <Text style={{ color: colors.muted }}>Loading habits…</Text> : habits.slice(0, 3).map(habit => <View key={habit.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, gap: 6 }}><Text style={{ color: colors.text, fontWeight: '600' }}>{habit.title}</Text><Text style={{ color: habit.completions.includes(today) ? colors.teal : colors.muted, fontSize: 12 }}>{habit.completions.includes(today) ? '✓ Complete today' : '○ Pending today'}</Text></View>)}
    {habits.length > 3 && <Text style={{ color: colors.muted, marginTop: 12 }}>+{habits.length - 3} more scheduled habits</Text>}
  </ListCard>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, minHeight: 0, backgroundColor: colors.bg }}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ width: '100%', maxWidth: 1600, alignSelf: 'center', padding: mobile ? 16 : 26, paddingBottom: 32 }}>
      <View style={{ minHeight: mobile ? 300 : 245, marginHorizontal: mobile ? -16 : -26, marginTop: mobile ? -16 : -26, padding: mobile ? 16 : 26, overflow: 'hidden' }}>
        <MountainScene style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: sidebar ? 'flex-end' : 'space-between', gap: 8, marginBottom: mobile ? 14 : 22 }}>{!sidebar && <Brand />}<ThemeSwitch compact /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', position: mobile ? 'relative' : 'absolute', top: mobile ? undefined : 29, right: mobile ? undefined : 142, gap: 7, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 14 }}><Icon name="sun" color={colors.amber} size={17} /><Text style={{ color: colors.muted, fontSize: 12 }}>{date}</Text></View>
        <Text style={{ color: colors.purple, fontSize: mobile ? 17 : 20, marginBottom: 8 }}>Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}{profile?.display_name ? `, ${profile.display_name}` : ','}</Text>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: mobile ? 33 : 44, fontWeight: '900', letterSpacing: -1.3, maxWidth: 780 }}>Let’s make <Text style={{ color: colors.teal }}>progress</Text> today.</Text>
        <Text style={{ color: colors.muted, fontSize: mobile ? 13 : 16, lineHeight: 23, marginTop: 12, maxWidth: 700 }}>Small steps. Big changes. You’re building a better you.</Text>
      </View>
      {(taskSystem.error || habitSystem.error) && <View style={{ marginVertical: 12 }}><Card><Text accessibilityRole="alert" style={{ color: colors.error }}>{taskSystem.error || habitSystem.error}</Text><Link href={taskSystem.error ? '/tasks' : '/habits'} style={{ color: colors.teal, paddingVertical: 12 }}>Review and retry →</Link></Card></View>}
      <View style={{ backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 15, marginVertical: 18 }}><Icon name="search" size={20} color={colors.faint} /><TextInput accessibilityLabel="Search tasks and habits" placeholder="Search tasks and habits…" placeholderTextColor={colors.faint} value={search} onChangeText={setSearch} style={{ flex: 1, minWidth: 0, minHeight: 48, color: colors.text, fontSize: 14 }} /></View>
      {query && <View style={{ marginBottom: 18 }}><Card><Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>Search results</Text>{matches.length ? matches.map(match => <Link key={`${match.type}-${match.id}`} href={match.href} style={{ color: colors.teal, paddingVertical: 12 }}>{match.title} · {match.type} →</Link>) : <Text style={{ color: colors.muted }}>{taskSystem.ready && habitSystem.ready ? 'No matching tasks or habits.' : 'Loading your tasks and habits…'}</Text>}</Card></View>}
      {!mobile && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <Stat label="Best habit streak" value={habitSystem.ready ? String(streak) : '—'} icon="flame" tint={colors.amber} href="/habits" />
        {showTasks && <Stat label="Tasks completed" value={taskSystem.ready ? `${tasks.percentage}%` : '—'} icon="tasks" tint={colors.teal} href="/tasks" />}
        {showHabits && <Stat label="Habits completed" value={habitSystem.ready ? `${habitSystem.progress.percentage}%` : '—'} icon="habits" tint={colors.purple} href="/habits" />}
        <Stat label="Focus time · coming soon" value="—" icon="bars" tint={colors.blue} />
      </View>}
      <View style={{ flexDirection: columns ? 'row' : 'column', gap: 18 }}>
        <View style={{ flex: columns ? 2.2 : undefined, minWidth: 0, gap: 18 }}>
          {(showTasks || showHabits) && <View style={{ flexDirection: 'row', gap: mobile ? 10 : 18 }}>
            {showTasks && <DashboardProgress label="Today’s task progress" href="/tasks" {...tasks} ready={taskSystem.ready} compact={mobile} description="Tasks due today or earlier, plus tasks without a due date." />}
            {showHabits && <DashboardProgress label="Today’s habit progress" href="/habits" {...habitSystem.progress} ready={habitSystem.ready} compact={mobile} purple description={habitSystem.ready && habits.length === 0 ? 'No habits scheduled today.' : 'Only habits scheduled today count.'} />}
          </View>}
          {mobile && <View style={{ flexDirection: 'row', gap: 10 }}><Stat label="Best habit streak" value={habitSystem.ready ? `${streak}` : '—'} icon="flame" tint={colors.amber} href="/habits" /><Stat label="Focus time · soon" value="—" icon="bars" tint={colors.blue} /></View>}
          {!columns && <View><CoachPreview compact={mobile} /></View>}
          {(showTasks || showHabits) && <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 18 }}>
            {showTasks && <View style={{ flex: mobile ? undefined : 1 }}>{taskList}</View>}{showHabits && <View style={{ flex: mobile ? undefined : 1 }}>{habitList}</View>}
          </View>}
          {!showTasks && !showHabits && <Card><Text style={{ color: colors.text, fontWeight: '700' }}>A little space to focus</Text><Link href="/settings" style={{ color: colors.teal, paddingVertical: 14 }}>Choose dashboard modules in Settings →</Link></Card>}
          <Text style={{ color: colors.faint, fontSize: 11, lineHeight: 18 }}>Best habit streak counts consecutive scheduled completions for one habit. Days off are skipped; an unfinished today does not break yesterday’s streak.</Text>
        </View>
        {columns && <View style={{ flex: 1, minWidth: 280 }}><CoachPreview compact={false} /></View>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

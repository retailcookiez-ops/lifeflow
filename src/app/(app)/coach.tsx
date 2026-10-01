import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { LifeFlowScreen, screenStyles } from '@/components/lifeflow-screen';
import { CoachResponse } from '@/components/coach-response';
import { useCoach } from '@/providers/coach-provider';
import { MAX_PROMPT } from '../../../supabase/functions/_shared/coach-contract';
const prompts = [
  ['Plan my day', 'Suggest a realistic plan for my day.'],
  ['Break down a task', 'Help me break down this task: '],
  ['Improve my routine', 'Suggest one small improvement to my daily routine.'],
  ['What should I focus on?', 'What should I focus on today? Explain your suggestions.'],
];
export default function CoachScreen() {
  const coach = useCoach();
  return <LifeFlowScreen title="AI Coach" eyebrow="IDEAS, AT YOUR PACE" subtitle="A little help planning your next step.">
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Suggestions only. You stay in control.</Text>
      <Text style={[screenStyles.muted, styles.space]}>AI can make mistakes. Review each suggestion and make any changes yourself in Tasks or Habits. The coach cannot create, edit, delete, complete or reschedule anything.</Text>
      <View style={styles.links}><Link href="/tasks" style={styles.link}>Open Tasks →</Link><Link href="/habits" style={styles.link}>Open Habits →</Link></View>
    </View>
    {coach.history.length === 0 && <View style={screenStyles.card}><Text style={screenStyles.label}>What would make today easier?</Text><Text style={[screenStyles.muted, styles.space]}>Plan your day, break a task into steps, explore a routine or suggest a study block. Choose a prompt to start, then send when ready.</Text></View>}
    <View style={styles.prompts}>{prompts.map(([label, prompt]) => <Pressable key={label} accessibilityRole="button" disabled={coach.busy} onPress={() => coach.setDraft(prompt)} style={styles.prompt}><Text style={styles.link}>{label}</Text></Pressable>)}</View>
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Your request</Text>
      <TextInput accessibilityLabel="Ask AI Coach" value={coach.draft} onChangeText={coach.setDraft} editable={!coach.busy} multiline maxLength={MAX_PROMPT} placeholder="What would you like help with?" placeholderTextColor="#82909F" style={styles.input} textAlignVertical="top" />
      <Text style={screenStyles.muted}>{coach.draft.length}/{MAX_PROMPT} · Avoid sensitive personal information.</Text>
      <View style={styles.toggle}><Text style={[screenStyles.label, { flex: 1 }]}>Share today’s context</Text><Switch accessibilityLabel="Share today’s context" value={coach.includeContext} onValueChange={coach.setIncludeContext} disabled={coach.busy} trackColor={{ false: '#394551', true: '#397E63' }} thumbColor="#8BE9C0" /></View>
      <Text style={screenStyles.muted}>Optional: display name, goals, wake/sleep times, device timezone, up to 12 today/overdue/undated tasks and 12 habits scheduled today, with completion status. No email, descriptions or past history. Your message and any selected context are sent to OpenAI. Provider retention rules apply.</Text>
      <Text style={[screenStyles.muted, styles.space]}>Each request is independent. Earlier messages are not sent. History stays in this app session only and clears on reload or logout.</Text>
      {coach.usage && <Text style={[screenStyles.muted, styles.space]}>{coach.usage.remaining}/{coach.usage.limit} attempts remaining at last request. Resets {new Date(coach.usage.resetAt).toLocaleString()}. A shared project limit also applies. Failed generation attempts count.</Text>}
      {coach.error && <View accessibilityRole="alert" style={styles.space}><Text style={styles.error}>{coach.error}</Text>{coach.retryAt > 0 && <Text style={screenStyles.muted}>Try after {new Date(coach.retryAt).toLocaleString()}.</Text>}</View>}
      <Pressable accessibilityRole="button" disabled={coach.busy || !coach.draft.trim()} onPress={() => void coach.send()} style={[styles.send, (coach.busy || !coach.draft.trim()) && { opacity: 0.5 }]}>{coach.busy ? <ActivityIndicator color="#0C1015" accessibilityLabel="Generating suggestions" /> : <Text style={styles.sendText}>{coach.error ? 'Retry request' : 'Get suggestions'}</Text>}</Pressable>
      {coach.busy && <Text accessibilityLiveRegion="polite" style={screenStyles.muted}>Generating suggestions… No changes are being made.</Text>}
    </View>
    {coach.history.length > 0 && <><View style={styles.toggle}><Text style={screenStyles.section}>This session</Text><Pressable accessibilityRole="button" disabled={coach.busy} onPress={coach.clear} style={styles.prompt}><Text style={styles.link}>Clear history</Text></Pressable></View>{[...coach.history].reverse().map(entry => <CoachResponse key={entry.id} prompt={entry.prompt} reply={entry.reply} />)}</>}
  </LifeFlowScreen>;
}
const styles = StyleSheet.create({
  space: { marginTop: 12 }, links: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 16 },
  link: { color: '#8BE9C0', fontSize: 13, fontWeight: '600', paddingVertical: 8 },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, prompt: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#20382F', borderRadius: 12 },
  input: { color: '#F4F7FA', backgroundColor: '#10161D', borderColor: '#394551', borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 110, marginVertical: 12, fontSize: 15 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginVertical: 16 },
  send: { minHeight: 48, borderRadius: 12, backgroundColor: '#8BE9C0', justifyContent: 'center', alignItems: 'center', marginVertical: 16 },
  sendText: { color: '#0C1015', fontWeight: '700' }, error: { color: '#FF9C9C', lineHeight: 22 },
});

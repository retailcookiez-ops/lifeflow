import { ProfileEditor } from '@/components/profile-editor';
import { DeleteAccountPanel } from '@/components/delete-account-panel';
import { useProfile } from '@/providers/profile-provider';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LifeFlowScreen, screenStyles } from '@/components/lifeflow-screen';
import { LocalImportPanel } from '@/components/local-import-panel';
import { useLifeFlow } from '@/providers/lifeflow-provider';
import { useAuth } from '@/providers/auth-provider';
import { friendlyError } from '@/lib/errors';
export default function SettingsScreen() {
  const { taskSystem, habitSystem } = useLifeFlow();
  const { session, signOut } = useAuth();
  const { saving: profileSaving, reload: reloadProfile } = useProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = taskSystem.saving || habitSystem.saving || profileSaving;
  async function sync() { await Promise.all([taskSystem.reload(), habitSystem.reload(), reloadProfile()]); }
  async function logout() {
    if (busy || saving) return;
    setBusy(true); setError(null);
    try { await signOut(); } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  }
  return <LifeFlowScreen title="Settings" eyebrow="YOUR LIFEFLOW" subtitle="Your app, your progress.">
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Your account</Text>
      <Text style={screenStyles.muted}>{session?.user.email}</Text>
      <Link href="/welcome" style={{ color: '#8BE9C0', paddingVertical: 14 }}>Open Welcome →</Link>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || saving }} disabled={busy || saving} onPress={() => { void logout(); }}
        style={{ minHeight: 44, justifyContent: 'center', opacity: busy || saving ? 0.4 : 1 }}>
        <Text style={{ color: '#FF9C9C', fontWeight: '600' }}>{busy ? 'Logging out…' : 'Log out'}</Text>
      </Pressable>
      {error && <Text accessibilityRole="alert" style={{ color: '#FF9C9C' }}>{error}</Text>}
    </View>
    <ProfileEditor />
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Cloud storage</Text>
      <Text style={screenStyles.muted}>Tasks, habits and check-ins belong to your account. Changes save to Supabase before the screen updates. An internet connection is required.</Text>
      <Text style={[screenStyles.muted, { marginTop: 12 }]}>Tasks: {taskSystem.ready ? taskSystem.tasks.length : 'Loading…'} · Habits: {habitSystem.ready ? habitSystem.habits.length : 'Loading…'}</Text>
      <Text style={[screenStyles.muted, { marginTop: 8 }]}>{taskSystem.error || habitSystem.error || (taskSystem.ready && habitSystem.ready ? 'Account data loaded.' : 'Loading cloud data…')}</Text>
      <Text style={screenStyles.muted}>Other devices refresh every 30 seconds and when the app resumes. You can also sync now. If two devices edit the same item, the last saved change wins.</Text>
      <Pressable accessibilityRole="button" disabled={saving || taskSystem.refreshing || habitSystem.refreshing}
        onPress={() => { void sync(); }} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: '#8BE9C0', fontWeight: '600' }}>{saving ? 'Saving…' : taskSystem.refreshing || habitSystem.refreshing ? 'Syncing…' : 'Sync now'}</Text>
      </Pressable>
    </View>
    <LocalImportPanel email={session?.user.email ?? 'this account'} disabled={saving || busy} onImported={sync} />
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Appearance</Text><Text style={screenStyles.muted}>Dark · Active</Text>
      <Text accessibilityState={{ disabled: true }} style={[screenStyles.muted, { opacity: 0.6, marginTop: 8 }]}>Light · Coming later</Text>
    </View>
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Calendar and history</Text>
      <Text style={screenStyles.muted}>Daily habit check-ins use your device’s local date. Use the same timezone on your devices for matching daily totals. Task due dates remain calendar dates. Habit schedule changes preserve earlier history.</Text>
    </View>
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Privacy and your data</Text>
      <Text style={screenStyles.muted}>Your profile, tasks, habits and check-ins are stored in your Supabase account. Owner-only database policies protect access. AI Coach sends your message to OpenAI only when you request suggestions; sharing today’s limited context is optional and off by default. Coach history stays in memory for the current login session. Only usage counters are stored in Supabase. OpenAI retention rules apply.</Text>
      <Text style={[screenStyles.muted, { marginTop: 10 }]}>Logging out keeps your cloud data. Older local data stays on this device until you choose to import it; deleting your account does not erase those local backups.</Text>
    </View>
    <DeleteAccountPanel disabled={saving || busy} />
    <View style={screenStyles.card}><Text style={screenStyles.label}>About LifeFlow</Text><Text style={screenStyles.muted}>Version 1.0.0 · Small steps. Consistent progress.</Text></View>
  </LifeFlowScreen>;
}

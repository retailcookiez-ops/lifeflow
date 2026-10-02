import { useAppTheme, useThemedStyles } from '@/providers/theme-provider';
import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LifeFlowScreen, screenStyles as basescreenStyles } from './lifeflow-screen';
import { useAuth } from '@/providers/auth-provider';
import { friendlyError } from '@/lib/errors';
import { validateAuth } from '@/utils/auth';

export function AuthForm({ signup }: { signup: boolean }) {
  const { color } = useAppTheme();
  const screenStyles = useThemedStyles(basescreenStyles);
  const styles = useThemedStyles(basestyles);
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function submit() {
    if (busy || !auth.configured) return;
    const invalid = validateAuth(email, password, signup);
    if (invalid) { setError(invalid); return; }
    if (signup && password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      if (signup) {
        const signedIn = await auth.signUp(email, password, name);
        if (!signedIn) setMessage('Check your inbox to confirm your email, then return here and log in. If you already have an account, use Log in.');
      } else await auth.signIn(email, password);
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); setPassword(''); setConfirm(''); }
  }
  return <LifeFlowScreen title={signup ? 'Create account' : 'Log in'} eyebrow="WELCOME TO LIFEFLOW" subtitle="Your progress, connected.">
    <View style={screenStyles.card}>
      {auth.error && <Text style={styles.error}>{auth.error}</Text>}
      {signup && <><Text style={styles.label}>Display name (optional)</Text><TextInput accessibilityLabel="Display name" style={styles.input} value={name} onChangeText={setName} maxLength={80} editable={!busy} placeholderTextColor={color("#9CA8B5")} /></>}
      <Text style={styles.label}>Email</Text>
      <TextInput accessibilityLabel="Email" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!busy} />
      <Text style={styles.label}>Password{signup ? ' (at least 8 characters)' : ''}</Text>
      <TextInput accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={signup ? 'new-password' : 'current-password'} maxLength={128} editable={!busy} onSubmitEditing={() => void submit()} />
      {signup && <><Text style={styles.label}>Confirm password</Text><TextInput accessibilityLabel="Confirm password" style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={128} editable={!busy} onSubmitEditing={() => void submit()} /></>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
      <Pressable accessibilityRole="button" disabled={busy || !auth.configured} onPress={() => void submit()} style={[styles.button, (busy || !auth.configured) && { opacity: 0.4 }]}>
        <Text style={styles.buttonText}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}</Text>
      </Pressable>
      <Link href={signup ? '/login' : '/signup'} style={styles.link}>{signup ? 'Already have an account? Log in' : 'New here? Create an account'}</Link>
      <Link href="/welcome" style={styles.link}>Back to welcome</Link>
    </View>
  </LifeFlowScreen>;
}
const basestyles = StyleSheet.create({
  label: { color: '#F4F7FA', marginTop: 12, marginBottom: 8, fontSize: 13 },
  input: { color: '#F4F7FA', backgroundColor: '#0C1015', borderWidth: 1, borderColor: '#28323D', borderRadius: 10, padding: 12, minHeight: 48 },
  button: { backgroundColor: '#8BE9C0', borderRadius: 10, padding: 14, marginTop: 20, minHeight: 48, alignItems: 'center' },
  buttonText: { color: '#062A2B', fontWeight: '700' },
  error: { color: '#FF9C9C', lineHeight: 20, marginTop: 12 },
  message: { color: '#8BE9C0', lineHeight: 20, marginTop: 12 },
  link: { color: '#8BE9C0', paddingVertical: 14 },
});

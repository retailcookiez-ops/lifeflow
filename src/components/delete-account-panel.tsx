import { useRef, useState } from 'react';
import { Modal, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { screenStyles } from '@/components/lifeflow-screen';
import { ProfileAction, ProfileInput, profileStyles } from '@/components/profile-fields';
import { useAuth } from '@/providers/auth-provider';
import { deleteAccount } from '@/services/delete-account';
import { friendlyError } from '@/lib/errors';
export function DeleteAccountPanel({ disabled }: { disabled: boolean }) {
  const { session, endDeletedSession } = useAuth();
  const [open, setOpen] = useState(false); const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null); const lock = useRef(false);
  function close() { if (!lock.current) { setOpen(false); setPassword(''); setConfirmation(''); setError(null); } }
  async function remove() {
    if (lock.current || disabled || confirmation !== 'DELETE' || !password) return;
    lock.current = true; setBusy(true); setError(null);
    try { await deleteAccount(password, confirmation); setPassword(''); await endDeletedSession(); }
    catch (cause) { setError(friendlyError(cause)); setPassword(''); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={screenStyles.card}>
    <Text style={screenStyles.label}>Delete account</Text>
    <Text style={screenStyles.muted}>Permanently delete your account and its cloud profile, tasks, habits and completion history. This cannot be undone.</Text>
    <ProfileAction label="Delete account…" danger disabled={disabled} onPress={() => setOpen(true)} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View accessibilityViewIsModal style={[screenStyles.card, { width: '100%', maxWidth: 520, gap: 16 }]}>
            <Text accessibilityRole="header" style={screenStyles.label}>Permanently delete your account?</Text>
            <Text style={screenStyles.muted}>{session?.user.email}</Text>
            <Text style={screenStyles.muted}>All your cloud data will be removed. Older local backups on your devices remain. Enter your current password and type DELETE to confirm.</Text>
            <ProfileInput label="Current password" value={password} onChangeText={setPassword} secure disabled={busy} maxLength={1024} />
            <ProfileInput label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} disabled={busy} />
            {error && <Text accessibilityRole="alert" style={profileStyles.error}>{error}</Text>}
            <ProfileAction label={busy ? 'Deleting account…' : 'Permanently delete account'} danger disabled={busy || disabled || !password || confirmation !== 'DELETE'} onPress={() => { void remove(); }} />
            <ProfileAction label="Cancel deletion" disabled={busy} onPress={close} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </View>;
}

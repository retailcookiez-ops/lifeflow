import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { screenStyles } from './lifeflow-screen';
import { friendlyError } from '@/lib/errors';
import { importLocalData, readLocalData, type LocalData } from '@/services/local-import';

export function LocalImportPanel({ email, disabled, onImported }: {
  email: string; disabled: boolean; onImported: () => Promise<void>;
}) {
  const [data, setData] = useState<LocalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  async function inspect() {
    setBusy(true); setError(null);
    try { setData(await readLocalData()); } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    void readLocalData().then(value => { if (active) setData(value); }).catch(cause => { if (active) setError(friendlyError(cause)); });
    return () => { active = false; };
  }, []);
  async function submit() {
    if (busy || disabled) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await importLocalData();
      setMessage(`Imported ${result.tasks} tasks and ${result.habits} habits. Previously imported items were skipped. Local originals are still stored on this device.`);
      setConfirming(false); await onImported();
    } catch (cause) { setError(`${friendlyError(cause)} Local originals are untouched; retrying is safe.`); }
    finally { setBusy(false); }
  }
  const count = data ? data.tasks.length + data.habits.length : 0;
  return <View style={screenStyles.card}>
    <Text style={screenStyles.label}>Import existing local data</Text>
    <Text style={screenStyles.muted}>Old tasks, habit schedules and check-in history stay on this device until you explicitly import them into your account. Import never overwrites cloud items or removes local originals. Retries skip already imported items.</Text>
    <Text style={[screenStyles.muted, { marginTop: 12 }]}>{data ? `${data.tasks.length} local tasks · ${data.habits.length} local habits` : error ? 'Local data unavailable' : 'Checking this device…'}</Text>
    {count === 0 && data && <Text style={screenStyles.muted}>No old local data to import on this device.</Text>}
    {count > 0 && !confirming && <Button label="Review import" disabled={busy || disabled} onPress={() => setConfirming(true)} />}
    {confirming && <>
      <Text style={[screenStyles.muted, { marginTop: 12 }]}>Import these items into {email}? Only import data that belongs to you. Deleting imported cloud items does not make them importable again.</Text>
      <Button label={busy ? 'Importing…' : 'Confirm import into this account'} disabled={busy || disabled} onPress={() => { void submit(); }} />
      <Button label="Cancel import" disabled={busy} onPress={() => setConfirming(false)} />
    </>}
    {message && <Text accessibilityLiveRegion="polite" style={[screenStyles.muted, { color: '#8BE9C0' }]}>{message}</Text>}
    {error && <><Text accessibilityRole="alert" style={{ color: '#FF9C9C', marginTop: 12 }}>{error}</Text><Button label="Check local data again" disabled={busy} onPress={() => { void inspect(); }} /></>}
  </View>;
}
function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={{ minHeight: 44, justifyContent: 'center', marginTop: 8, opacity: disabled ? 0.4 : 1 }}>
    <Text style={{ color: '#8BE9C0', fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

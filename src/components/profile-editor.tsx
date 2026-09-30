import { useState } from 'react';
import { Text, View } from 'react-native';
import { screenStyles } from '@/components/lifeflow-screen';
import { ProfileAction, ProfileFields, profileStyles } from '@/components/profile-fields';
import { useProfile } from '@/providers/profile-provider';
import { profileFields } from '@/services/profile';
import { validateProfile } from '@/utils/profile';
export function ProfileEditor() {
  const { profile, saving, save, error } = useProfile();
  // Keep an in-progress draft when background sync updates the saved profile.
  const [draft, setDraft] = useState(() => profile ? profileFields(profile) : null);
  const [message, setMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  if (!profile || !draft) return null;
  async function submit() {
    if (!draft || saving) return;
    const invalid = validateProfile(draft); setValidation(invalid); setMessage(null);
    if (!invalid && await save(draft)) setMessage('Profile saved. Your dashboard is up to date.');
  }
  return <View style={screenStyles.card}>
    <Text style={screenStyles.label}>Profile and preferences</Text>
    <View style={{ gap: 24 }}>
      {(['identity', 'routine', 'modules'] as const).map(section => <ProfileFields key={section} section={section} value={draft} disabled={saving}
        onChange={next => { setDraft(next); setMessage(null); setValidation(null); }} />)}
      {(validation || error) && <Text accessibilityRole="alert" style={profileStyles.error}>{validation || error}</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={{ color: '#8BE9C0' }}>{message}</Text>}
      <View style={profileStyles.row}>
        <ProfileAction label={saving ? 'Saving profile…' : 'Save profile'} primary disabled={saving} onPress={() => { void submit(); }} />
        <ProfileAction label="Discard edits" disabled={saving} onPress={() => { setDraft(profileFields(profile)); setMessage(null); setValidation(null); }} />
      </View>
    </View>
  </View>;
}

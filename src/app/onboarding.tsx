import { useAppTheme, useThemedStyles } from '@/providers/theme-provider';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { LifeFlowScreen, screenStyles as basescreenStyles } from '@/components/lifeflow-screen';
import { ProfileAction, ProfileFields, profileStyles as baseprofileStyles } from '@/components/profile-fields';
import { useProfile } from '@/providers/profile-provider';
import { useAuth } from '@/providers/auth-provider';
import { profileFields } from '@/services/profile';
import { validateProfile } from '@/utils/profile';
const steps = [
  { title: 'Make LifeFlow yours', section: 'identity', detail: 'A name and a little direction. Every field is optional.' },
  { title: 'Your daily rhythm', section: 'routine', detail: 'Set your preferences. You can change these anytime.' },
  { title: 'Choose your focus', section: 'modules', detail: 'Keep your dashboard useful and simple.' },
] as const;
export default function OnboardingScreen() {
  const { color } = useAppTheme();
  const screenStyles = useThemedStyles(basescreenStyles);
  const profileStyles = useThemedStyles(baseprofileStyles);
  const { profile, save, saving, error } = useProfile();
  const { signOut } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => profile ? profileFields(profile) : null);
  const [validation, setValidation] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  if (!profile || !draft) return null;
  const disabled = saving || leaving;
  async function next() {
    if (!draft || disabled) return;
    const invalid = validateProfile(draft); setValidation(invalid);
    if (invalid) return;
    if (step < 2) setStep(step + 1); else await save(draft, true);
  }
  async function skip() {
    if (!profile || disabled) return;
    // Explicit skip uses saved defaults, not an invalid unfinished draft.
    setValidation(null); await save(profileFields(profile), true);
  }
  async function logout() {
    setLeaving(true);
    try { await signOut(); } catch { setValidation('Could not log out. Please try again.'); }
    finally { setLeaving(false); }
  }
  return <LifeFlowScreen title={steps[step].title} eyebrow={`WELCOME TO LIFEFLOW · ${step + 1} OF 3`} subtitle={steps[step].detail}>
    <View style={[profileStyles.row, { marginBottom: 20 }]}>{steps.map((item, index) => <View key={item.section}
      style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: index <= step ? color('#8BE9C0') : color('#28323D') }} />)}</View>
    <View style={screenStyles.card}><ProfileFields section={steps[step].section} value={draft} onChange={setDraft} disabled={disabled} /></View>
    {(validation || error) && <Text accessibilityRole="alert" style={[profileStyles.error, { marginBottom: 16 }]}>{validation || error}</Text>}
    <View style={profileStyles.row}>
      {step > 0 && <ProfileAction label="Back" disabled={disabled} onPress={() => { setStep(step - 1); setValidation(null); }} />}
      <ProfileAction label={saving ? 'Saving…' : step === 2 ? 'Finish setup' : 'Continue'} primary disabled={disabled} onPress={() => { void next(); }} />
      <ProfileAction label="Skip setup" disabled={disabled} onPress={() => { void skip(); }} />
    </View>
    <Text style={[screenStyles.muted, { marginVertical: 18 }]}>Skipping keeps the default dashboard and saves setup as complete. You can edit everything in Settings.</Text>
    <ProfileAction label="Log out" disabled={disabled} onPress={() => { void logout(); }} />
  </LifeFlowScreen>;
}

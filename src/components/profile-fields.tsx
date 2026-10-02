import { useAppTheme, useThemedStyles } from '@/providers/theme-provider';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { screenStyles as basescreenStyles } from '@/components/lifeflow-screen';
import { GOALS, MODULES, type ProfileFields as Fields } from '@/utils/profile';
export function ProfileAction({ label, onPress, disabled = false, primary = false, danger = false }: {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean;
}) {
  const { color } = useAppTheme();
  const profileStyles = useThemedStyles(baseprofileStyles);
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[profileStyles.button, primary && profileStyles.primary, disabled && { opacity: 0.45 }]}>
    <Text style={{ color: danger ? color('#FF9C9C') : primary ? color('#062A2B') : color('#8BE9C0'), fontWeight: '700' }}>{label}</Text>
  </Pressable>;
}
export function ProfileInput({ label, value, onChangeText, placeholder, disabled = false, secure = false, maxLength = 100 }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; disabled?: boolean; secure?: boolean; maxLength?: number;
}) {
  const { color } = useAppTheme();
  const screenStyles = useThemedStyles(basescreenStyles);
  const profileStyles = useThemedStyles(baseprofileStyles);
  return <View style={{ gap: 6 }}><Text style={screenStyles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} style={profileStyles.input} value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={color("#9CA8B5")} selectionColor={color("#8BE9C0")} editable={!disabled}
      autoCapitalize="none" autoCorrect={false} secureTextEntry={secure} maxLength={maxLength} />
  </View>;
}
function Choice({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled: boolean }) {
  const { color } = useAppTheme();
  const profileStyles = useThemedStyles(baseprofileStyles);
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }}
    disabled={disabled} onPress={onPress} style={[profileStyles.button, selected && profileStyles.selected, disabled && { opacity: 0.45 }]}>
    <Text style={{ color: selected ? color('#8BE9C0') : color('#C2CAD4') }}>{selected ? '✓ ' : '+ '}{label}</Text>
  </Pressable>;
}
export function ProfileFields({ value, onChange, section, disabled = false }: {
  value: Fields; onChange: (fields: Fields) => void; section: 'identity' | 'routine' | 'modules'; disabled?: boolean;
}) {
  const screenStyles = useThemedStyles(basescreenStyles);
  const profileStyles = useThemedStyles(baseprofileStyles);
  function update<K extends keyof Fields>(key: K, next: Fields[K]) { onChange({ ...value, [key]: next }); }
  return <View style={profileStyles.fields}>
    {section === 'identity' && <>
      <ProfileInput label="Display name" value={value.displayName} onChangeText={name => update('displayName', name)} maxLength={80} disabled={disabled} placeholder="What should we call you?" />
      <Text style={screenStyles.label}>What matters to you?</Text>
      <Text style={screenStyles.muted}>Choose any goals, or leave these blank. These are preferences, not extra features.</Text>
      <View style={profileStyles.row}>{GOALS.map(goal => <Choice key={goal.value} label={goal.label} selected={value.goals.includes(goal.value)} disabled={disabled}
        onPress={() => update('goals', value.goals.includes(goal.value) ? value.goals.filter(item => item !== goal.value) : [...value.goals, goal.value])} />)}</View>
    </>}
    {section === 'routine' && <>
      <ProfileInput label="Wake time (optional)" value={value.wakeTime} onChangeText={time => update('wakeTime', time)} placeholder="07:00" maxLength={5} disabled={disabled} />
      <ProfileInput label="Sleep time (optional)" value={value.sleepTime} onChangeText={time => update('sleepTime', time)} placeholder="23:00" maxLength={5} disabled={disabled} />
      <Text style={screenStyles.muted}>Use 24-hour HH:MM. These preferences do not create reminders or change your tasks.</Text>
      <ProfileInput label="Timezone" value={value.timezone} onChangeText={zone => update('timezone', zone)} placeholder="Europe/Zurich" disabled={disabled} />
      <ProfileAction label="Use device timezone" disabled={disabled} onPress={() => update('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')} />
      <Text style={screenStyles.muted}>Timezone is saved to your profile. Daily progress still follows your device’s local date; changing this preference does not move past check-ins.</Text>
      <Text style={screenStyles.label}>Week starts on</Text>
      <View style={profileStyles.row}>{([{ value: 1, label: 'Monday' }, { value: 0, label: 'Sunday' }] as const).map(day =>
        <Choice key={day.value} label={day.label} selected={value.weekStart === day.value} disabled={disabled} onPress={() => update('weekStart', day.value)} />)}</View>
    </>}
    {section === 'modules' && <>
      <Text style={screenStyles.label}>Your dashboard modules</Text>
      <Text style={screenStyles.muted}>Choose which summaries appear on Home. Tasks and Habits always remain available in navigation. Nothing is deleted if you hide a summary.</Text>
      <View style={profileStyles.row}>{MODULES.map(module => <Choice key={module.value} label={`${module.label} summary`} selected={value.modules.includes(module.value)} disabled={disabled}
        onPress={() => update('modules', value.modules.includes(module.value) ? value.modules.filter(item => item !== module.value) : [...value.modules, module.value])} />)}</View>
    </>}
  </View>;
}
export const baseprofileStyles = StyleSheet.create({
  fields: { gap: 14 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { color: '#F4F7FA', backgroundColor: '#0C1015', borderWidth: 1, borderColor: '#344150', borderRadius: 12, padding: 14, minHeight: 48, fontSize: 15 },
  button: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#344150', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#8BE9C0', borderColor: '#8BE9C0' }, selected: { borderColor: '#8BE9C0', backgroundColor: '#20382F' },
  error: { color: '#FF9C9C', lineHeight: 21 },
});

export { baseprofileStyles as profileStyles };

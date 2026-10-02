import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { Icon } from './artwork';
export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, colors, choose, error } = useAppTheme();
  return <View style={{ gap: 8 }}><View style={{ flexDirection: 'row', gap: 6 }}>
    {(['light', 'dark'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value === 'light' ? 'Light' : 'Dark'} theme`} accessibilityState={{ selected: mode === value }} onPress={() => choose(value)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, minWidth: 44, paddingHorizontal: compact ? 10 : 18, borderRadius: 12, backgroundColor: mode === value ? colors.active : colors.inset, borderWidth: 1, borderColor: mode === value ? colors.teal : colors.border }}>
      <Icon name={value === 'light' ? 'sun' : 'moon'} color={mode === value ? colors.teal : colors.muted} size={18} />{!compact && <Text style={{ color: colors.text }}>{value === 'light' ? 'Light' : 'Dark'}</Text>}
    </Pressable>)}
  </View>{error && <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text>}</View>;
}

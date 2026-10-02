import { useSyncExternalStore } from 'react';
import { Link, Slot, usePathname } from 'expo-router';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/providers/theme-provider';
import { useProfile } from '@/providers/profile-provider';
import { Icon, type IconName } from './artwork';
import { ThemeSwitch } from './theme-switch';
const subscribe = () => () => {};
const routes: { href: '/' | '/tasks' | '/habits' | '/coach' | '/settings'; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'home' }, { href: '/tasks', label: 'Tasks', icon: 'tasks' },
  { href: '/habits', label: 'Habits', icon: 'habits' }, { href: '/coach', label: 'AI Coach', icon: 'coach' }, { href: '/settings', label: 'Settings', icon: 'settings' },
];
export function Brand() {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Icon name="wave" color={colors.teal} size={29} /><View><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>LIFE<Text style={{ color: colors.teal }}>FLOW</Text></Text></View></View>;
}
export default function AppNavigation() {
  const { width } = useWindowDimensions(); const pathname = usePathname(); const { colors } = useAppTheme(); const { profile } = useProfile();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const wide = Platform.OS === 'web' && hydrated && width >= 900; const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.bg, flexDirection: wide ? 'row-reverse' : 'column' }}>
    <View style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}><Slot /></View>
    <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRightWidth: wide ? 1 : 0, borderTopWidth: wide ? 0 : 1, width: wide ? 230 : undefined, flexDirection: wide ? 'column' : 'row', paddingHorizontal: wide ? 16 : 4, paddingTop: wide ? 30 : 8, paddingBottom: wide ? 24 : Math.max(8, insets.bottom), gap: wide ? 10 : 2 }}>
      {wide && <View style={{ padding: 10, marginBottom: 28 }}><Brand /><Text style={{ color: colors.muted, fontSize: 11, marginTop: 9 }}>Your personal growth space</Text></View>}
      {routes.map(route => { const active = pathname === route.href; return <Link key={route.href} href={route.href} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={route.label} accessibilityState={{ selected: active }} style={({ pressed }) => ({ minHeight: 56, flex: wide ? undefined : 1, flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: wide ? 'flex-start' : 'center', paddingHorizontal: wide ? 16 : 0, gap: wide ? 14 : 5, borderRadius: 13, backgroundColor: active ? colors.active : 'transparent', opacity: pressed ? 0.6 : 1 })}>
          <Icon name={route.icon} color={active ? colors.teal : colors.muted} size={23} /><Text style={{ color: active ? colors.teal : colors.muted, fontWeight: active ? '700' : '500', fontSize: wide ? 14 : 10 }}>{route.label}</Text>
        </Pressable>
      </Link>; })}
      {wide && <View style={{ marginTop: 'auto', gap: 20, padding: 10 }}><ThemeSwitch />
        <Link href="/settings" asChild><Pressable accessibilityRole="link" accessibilityLabel="Your Profile" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}><View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.inset, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.teal, fontWeight: '700' }}>{profile?.display_name?.charAt(0).toUpperCase() || 'Y'}</Text></View><Text style={{ color: colors.muted }}>Your Profile</Text><Icon name="chevron" size={16} color={colors.muted} /></Pressable></Link>
        <Text style={{ color: colors.faint, fontSize: 11, lineHeight: 18 }}>Small steps. Consistent progress.</Text>
      </View>}
    </View>
  </View>;
}

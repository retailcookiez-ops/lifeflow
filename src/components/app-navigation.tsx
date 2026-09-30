import { useSyncExternalStore } from 'react';
import { Link, Slot, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const ROUTES = [
  { href: '/' as const, label: 'Dashboard', icon: '▦' },
  { href: '/tasks' as const, label: 'Tasks', icon: '✓' },
  { href: '/habits' as const, label: 'Habits', icon: '↻' },
  { href: '/settings' as const, label: 'Settings', icon: '⚙' },
];

export default function AppNavigation() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const wide = Platform.OS === 'web' && hydrated && width >= 900;
  const insets = useSafeAreaInsets();
  return <View style={[styles.shell, wide && styles.wideShell]}>
    <View style={styles.content}><Slot /></View>
    <View style={[styles.navigation, wide ? styles.sidebar : styles.bottom,
      { paddingBottom: wide ? 24 : Math.max(8, insets.bottom), paddingTop: wide ? Math.max(32, insets.top) : 8 }]}>
      {wide && <View style={styles.brand}>
        <Text style={styles.logo}>LIFE<Text style={styles.activeText}>FLOW</Text></Text>
        <Text style={styles.subtitle}>Your personal growth space</Text>
      </View>}
      {ROUTES.map(route => {
        const active = pathname === route.href;
        return <Link key={route.href} href={route.href} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={route.label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.button, wide ? styles.sideButton : styles.bottomButton,
              active && styles.active, pressed && styles.pressed]}>
            <Text accessibilityElementsHidden importantForAccessibility="no"
              style={[styles.icon, active && styles.activeText]}>{route.icon}</Text>
            <Text style={[styles.label, active && styles.activeText]}>{route.label}</Text>
          </Pressable>
        </Link>;
      })}
      {wide && <Text style={styles.sideFooter}>Small steps. Consistent progress.</Text>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0C1015' },
  wideShell: { flexDirection: 'row-reverse' },
  content: { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' },
  navigation: { flexShrink: 0, backgroundColor: '#111820', borderColor: '#28323D' },
  sidebar: { width: 232, paddingHorizontal: 16, borderRightWidth: 1, gap: 10, flexDirection: 'column', justifyContent: 'flex-start' },
  bottom: { flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 6, gap: 4 },
  brand: { paddingHorizontal: 12, marginBottom: 32 },
  logo: { color: '#F4F7FA', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: '#9CA8B5', fontSize: 11, marginTop: 8 },
  button: { borderRadius: 12, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 4 },
  sideButton: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, gap: 14 },
  bottomButton: { flex: 1, paddingVertical: 6 },
  icon: { color: '#9CA8B5', fontSize: 21 },
  label: { color: '#9CA8B5', fontSize: 11, fontWeight: '600' },
  active: { backgroundColor: '#20382F' },
  activeText: { color: '#8BE9C0' },
  pressed: { opacity: 0.65 },
  sideFooter: { color: '#65717F', fontSize: 11, lineHeight: 18, marginTop: 'auto', padding: 12 },
});

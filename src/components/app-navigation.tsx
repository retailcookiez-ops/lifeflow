import { useSyncExternalStore } from 'react';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const ROUTES = [
  { name: 'dashboard', href: '/' as const, label: 'Dashboard', icon: '▦' },
  { name: 'tasks', href: '/tasks' as const, label: 'Tasks', icon: '✓' },
  { name: 'habits', href: '/habits' as const, label: 'Habits', icon: '↻' },
  { name: 'settings', href: '/settings' as const, label: 'Settings', icon: '⚙' },
];
function NavButton({ isFocused, children, icon, wide, ...props }: TabTriggerSlotProps & { icon: string; wide: boolean }) {
  return <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }}
    style={({ pressed }) => [styles.button, wide ? styles.sideButton : styles.bottomButton,
      isFocused && styles.active, pressed && styles.pressed]}>
    <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.icon, isFocused && styles.activeText]}>{icon}</Text>
    <Text style={[styles.label, isFocused && styles.activeText]}>{children}</Text>
  </Pressable>;
}
export default function AppNavigation() {
  const { width } = useWindowDimensions();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const wide = Platform.OS === 'web' && hydrated && width >= 900;
  const insets = useSafeAreaInsets();
  return <Tabs style={[styles.shell, wide && styles.wideShell]}>
    <TabSlot style={styles.content} />
    <TabList style={[styles.navigation, wide ? styles.sidebar : styles.bottom,
      { paddingBottom: wide ? 24 : Math.max(8, insets.bottom), paddingTop: wide ? Math.max(32, insets.top) : 8 }]}>
      {wide && <View style={styles.brand}>
        <Text style={styles.logo}>LIFE<Text style={styles.activeText}>FLOW</Text></Text>
        <Text style={styles.subtitle}>Your personal growth space</Text>
      </View>}
      {ROUTES.map(route => <TabTrigger key={route.name} name={route.name} href={route.href} asChild>
        <NavButton icon={route.icon} wide={wide}>{route.label}</NavButton>
      </TabTrigger>)}
      {wide && <Text style={styles.sideFooter}>Small steps. Consistent progress.</Text>}
    </TabList>
  </Tabs>;
}
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0C1015' },
  wideShell: { flexDirection: 'row-reverse' },
  content: { flex: 1, minWidth: 0 },
  navigation: { backgroundColor: '#111820', borderColor: '#28323D' },
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

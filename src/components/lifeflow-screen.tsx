import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/providers/theme-provider';
import { Brand } from './app-navigation';
import { ThemeSwitch } from './theme-switch';
export function LifeFlowScreen({ title, eyebrow, subtitle, children }: { title: string; eyebrow: string; subtitle: string; children: ReactNode }) {
  const { colors } = useAppTheme();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, minHeight: 0, backgroundColor: colors.bg }}>
    <ScrollView style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 22, paddingTop: 30, paddingBottom: 32, width: '100%', maxWidth: 860, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 12 }}><Brand /><ThemeSwitch compact /></View>
      <Text style={{ color: colors.teal, fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 34, fontWeight: '800', marginTop: 8 }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8, marginBottom: 24 }}>{subtitle}</Text>
      {children}
      <Text style={{ color: colors.faint, fontSize: 10, textAlign: 'center', marginTop: 25, letterSpacing: 1 }}>LIFEFLOW · YOUR PROGRESS, CONNECTED.</Text>
    </ScrollView>
  </SafeAreaView>;
}
export const screenStyles = StyleSheet.create({
  card: { backgroundColor: '#171E27', borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#28323D' },
  section: { color: '#F4F7FA', fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 14 },
  muted: { color: '#9CA8B5', fontSize: 13, lineHeight: 20 },
  label: { color: '#F4F7FA', fontSize: 15, fontWeight: '700', marginBottom: 8 },
});

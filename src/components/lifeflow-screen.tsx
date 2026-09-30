import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LifeFlowScreen({ title, eyebrow, subtitle, children }: {
  title: string; eyebrow: string; subtitle: string; children: ReactNode;
}) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.logo}>LIFE<Text style={{ color: '#8BE9C0' }}>FLOW</Text></Text>
          <Text style={styles.muted}>Your personal growth space</Text></View>
        <View style={styles.avatar}><Text style={{ color: '#8BE9C0', fontWeight: 'bold' }}>Y</Text></View>
      </View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <Text style={[styles.muted, { marginBottom: 24 }]}>{subtitle}</Text>
      {children}
      <Text style={styles.footer}>LIFEFLOW · YOUR PROGRESS, CONNECTED.</Text>
    </ScrollView>
  </SafeAreaView>;
}
export const screenStyles = StyleSheet.create({
  card: { backgroundColor: '#171E27', borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#28323D' },
  section: { color: '#F4F7FA', fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 14 },
  muted: { color: '#9CA8B5', fontSize: 13, lineHeight: 20 },
  label: { color: '#F4F7FA', fontSize: 15, fontWeight: '700', marginBottom: 8 },
});
const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  safe: { flex: 1, minHeight: 0, backgroundColor: '#0C1015' },
  container: { padding: 22, paddingTop: 35, paddingBottom: 32, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  logo: { color: '#F4F7FA', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  muted: { color: '#9CA8B5', fontSize: 13, lineHeight: 20 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#171E27', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#8BE9C0', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  heading: { color: '#F4F7FA', fontSize: 38, fontWeight: '800', marginTop: 8 },
  footer: { color: '#65717F', fontSize: 10, textAlign: 'center', marginTop: 25, letterSpacing: 1 },
});

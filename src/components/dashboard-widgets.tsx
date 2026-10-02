import type { ReactNode } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { useCoach } from '@/providers/coach-provider';
import { CoachMascot, Icon, ProgressRing, type IconName } from './artwork';
export function Card({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 20, height: '100%' }}>{children}</View>;
}
export function DashboardProgress({ label, href, done, total, percentage, ready, compact, purple = false, description }: { label: string; href: '/tasks' | '/habits'; done: number; total: number; percentage: number; ready: boolean; compact: boolean; purple?: boolean; description: string }) {
  const { colors } = useAppTheme(); const tint = purple ? colors.purple : colors.teal;
  return <Link href={href} asChild><Pressable accessibilityRole="link" accessibilityLabel={`${label}: ${ready ? percentage+'%' : 'loading'}`} style={{ flex: 1 }}><Card>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: compact ? 14 : 20 }}><Icon name={purple ? 'habits' : 'tasks'} color={tint} size={20} /><Text style={{ color: colors.text, fontSize: compact ? 12 : 14, fontWeight: '700', flex: 1 }}>{label}</Text>{!compact && <Icon name="chevron" color={colors.faint} size={16} />}</View>
    {compact ? <View style={{ alignItems: 'center' }}><ProgressRing percentage={ready ? percentage : 0} color={tint} /><View style={{ position: 'absolute', top: 30, alignItems: 'center' }}><Text style={{ color: tint, fontSize: 28, fontWeight: '800' }}>{ready ? `${percentage}%` : '—'}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{ready ? `${done} of ${total}` : 'Loading…'}</Text></View></View> : <>
      <Text style={{ color: tint, fontSize: 48, fontWeight: '800' }}>{ready ? `${percentage}%` : '—'}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{ready ? `${done} of ${total} completed` : 'Loading saved data…'}</Text>
      <View style={{ height: 9, borderRadius: 8, backgroundColor: colors.inset, marginVertical: 20, overflow: 'hidden' }}><View style={{ height: '100%', width: `${ready ? percentage : 0}%`, backgroundColor: tint }} /></View><Text style={{ color: colors.faint, fontSize: 12, lineHeight: 18 }}>{description}</Text>
    </>}
  </Card></Pressable></Link>;
}
export function Stat({ label, value, icon, tint, href }: { label: string; value: string; icon: IconName; tint: string; href?: '/tasks' | '/habits' }) {
  const { colors } = useAppTheme();
  const body = <View style={{ minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><View style={{ padding: 10, borderRadius: 14, backgroundColor: colors.inset }}><Icon name={icon} color={tint} size={24} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 23, fontWeight: '800' }}>{value}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{label}</Text></View></View>;
  return href ? <Link href={href} asChild><Pressable style={{ flex: 1 }} accessibilityRole="link" accessibilityLabel={label}>{body}</Pressable></Link> : <View style={{ flex: 1 }}>{body}</View>;
}
export function CoachPreview({ compact }: { compact: boolean }) {
  const { colors } = useAppTheme(); const { setDraft } = useCoach();
  const prompts = ['Help me plan my day', 'Give me motivation', 'Suggest better habits', 'I’m feeling stuck'];
  function open(prompt = '') { setDraft(prompt); router.push('/coach'); }
  return <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="coach" color={colors.purple} /><Text style={{ color: colors.purple, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>AI COACH</Text></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 150 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 27, fontWeight: '800', marginBottom: 10 }}>Hi there!</Text>{!compact && <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>A little help planning your day and building better routines.</Text>}</View><CoachMascot /></View>
    {!compact && <View style={{ gap: 8, marginBottom: 18 }}>{prompts.map(prompt => <Pressable key={prompt} accessibilityRole="button" onPress={() => open(prompt)} style={({ pressed }) => ({ padding: 13, minHeight: 46, borderRadius: 12, backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, opacity: pressed ? .6 : 1 })}><Text style={{ color: colors.muted, fontSize: 13 }}>{prompt}</Text></Pressable>)}</View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Chat with AI Coach" onPress={() => open()} style={{ minHeight: 46, borderRadius: 24, backgroundColor: colors.teal, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.buttonText, fontWeight: '700' }}>Chat with AI Coach</Text><Icon name="arrow" color={colors.buttonText} size={18} /></Pressable>
    <Text style={{ color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: 12 }}>Suggestions only. You choose what changes.</Text>
  </Card>;
}
export function ListCard({ title, icon, href, children, empty, addLabel, purple = false }: { title: string; icon: IconName; href: '/tasks' | '/habits'; children?: ReactNode; empty?: string; addLabel: string; purple?: boolean }) {
  const { colors } = useAppTheme(); const tint = purple ? colors.purple : colors.teal;
  return <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}><Icon name={icon} color={tint} size={22} /><Text style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 }}>{title}</Text><Link href={href} accessibilityLabel={`View all ${href.slice(1)}`} style={{ color: tint, fontSize: 12, paddingVertical: 12 }}>View all →</Link></View>
    {empty ? <View style={{ borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 14, padding: 20, alignItems: 'center', gap: 14 }}><Icon name={icon} color={colors.faint} size={30} /><Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>{empty}</Text><Link href={href} asChild><Pressable accessibilityRole="link" style={{ borderRadius: 24, minHeight: 42, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tint }}><Icon name="plus" color={colors.buttonText} size={18} /><Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 12 }}>{addLabel}</Text></Pressable></Link></View> : children}
  </Card>;
}

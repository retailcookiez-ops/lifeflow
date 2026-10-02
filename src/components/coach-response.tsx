import { useAppTheme, useThemedStyles } from '@/providers/theme-provider';
import { Text, View } from 'react-native';
import { screenStyles as basescreenStyles } from '@/components/lifeflow-screen';
import type { CoachReply } from '../../supabase/functions/_shared/coach-contract';
export function CoachResponse({ prompt, reply }: { prompt: string; reply: CoachReply }) {
  const { color } = useAppTheme();
  const screenStyles = useThemedStyles(basescreenStyles);
  return <View style={{ gap: 12 }}>
    <Text style={screenStyles.label}>You: {prompt}</Text>
    <View style={screenStyles.card}>
      <Text style={{ color: color('#8BE9C0'), fontWeight: '700', marginBottom: 10 }}>AI-generated suggestions · Nothing has been changed</Text>
      <Text style={screenStyles.label}>{reply.answer.summary}</Text>
      <Text style={[screenStyles.muted, { marginTop: 10 }]}>{reply.contextIncluded ? `Shared today’s context: ${reply.contextSummary.tasks} tasks and ${reply.contextSummary.habits} habits${reply.contextSummary.truncated ? ' (limited selection)' : ''}.` : 'Based only on your message.'}</Text>
    </View>
    {reply.answer.suggestions.map((card, index) => <View key={index} style={screenStyles.card}>
      <Text style={screenStyles.label}>{card.title}</Text>
      <Text style={[screenStyles.muted, { marginVertical: 10 }]}>{card.reason}</Text>
      {card.steps.map((step, stepIndex) => <Text key={stepIndex} style={[screenStyles.muted, { marginTop: 8 }]}>{stepIndex + 1}. {step}</Text>)}
    </View>)}
  </View>;
}

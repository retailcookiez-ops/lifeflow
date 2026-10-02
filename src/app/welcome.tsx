import { useAppTheme, useThemedStyles } from '@/providers/theme-provider';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { LifeFlowScreen, screenStyles as basescreenStyles } from '@/components/lifeflow-screen';
import { useAuth } from '@/providers/auth-provider';
export default function WelcomeScreen() {
  const { color } = useAppTheme();
  const screenStyles = useThemedStyles(basescreenStyles);
  const auth = useAuth();
  return <LifeFlowScreen title="Welcome" eyebrow="YOUR PERSONAL GROWTH SPACE" subtitle="Small steps. Consistent progress.">
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Your tasks. Your habits. Wherever you are.</Text>
      <Text style={screenStyles.muted}>{auth.session ? 'You are signed in. Continue to your dashboard to see task and habit progress.' : 'Create an account or log in to save your LifeFlow progress across devices. Existing local data stays safe until you choose to import it.'}</Text>
      {auth.error && <Text accessibilityRole="alert" style={{ color: color('#FF9C9C'), marginTop: 16, lineHeight: 20 }}>{auth.error}</Text>}
      {auth.error && auth.configured && <Pressable accessibilityRole="button" onPress={() => { void auth.retry(); }} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: color('#8BE9C0') }}>Retry session check</Text>
      </Pressable>}
      {auth.session ? <Link href="/" style={{ color: color('#8BE9C0'), paddingVertical: 18, fontWeight: '700' }}>Continue to Dashboard →</Link> : <>
      <Link href="/signup" style={{ color: color('#8BE9C0'), paddingVertical: 18, fontWeight: '700' }}>Create an account →</Link>
      <Link href="/login" style={{ color: color('#8BE9C0'), paddingVertical: 18, fontWeight: '700' }}>Log in →</Link>
      </>}
    </View>
  </LifeFlowScreen>;
}

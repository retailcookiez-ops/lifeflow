import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StatusBar, Text, View } from 'react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
void SplashScreen.preventAutoHideAsync().catch(() => {});
function Routes() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: '#0C1015', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
    <ActivityIndicator color="#8BE9C0" /><Text style={{ color: '#9CA8B5' }}>Checking your session…</Text>
  </View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0C1015' } }}>
    <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
    <Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <ThemeProvider value={DarkTheme}><AuthProvider>
    <StatusBar barStyle="light-content" /><AnimatedSplashOverlay /><Routes />
  </AuthProvider></ThemeProvider>;
}

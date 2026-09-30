import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StatusBar, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync().catch(() => {});
function hideSplash() { void SplashScreen.hideAsync().catch(() => {}); }

function Routes() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: '#0C1015', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
    <ActivityIndicator color="#8BE9C0" /><Text style={{ color: '#9CA8B5' }}>Checking your session…</Text>
  </View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0C1015' } }}>
    <Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
    <Stack.Screen name="welcome" />
    <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <ThemeProvider value={DarkTheme}><AuthProvider>
    <StatusBar barStyle="light-content" />
    {/* Hide the native splash on layout. No animation overlay can obscure the screens. */}
    <View style={{ flex: 1, backgroundColor: '#0C1015' }} onLayout={hideSplash}><Routes /></View>
  </AuthProvider></ThemeProvider>;
}

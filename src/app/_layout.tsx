import { AppThemeProvider, useAppTheme, useThemedStyles } from '@/providers/theme-provider';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StatusBar, Text, View } from 'react-native';
import { ProfileProvider, useProfile } from '@/providers/profile-provider';
import { LifeFlowScreen, screenStyles as baseScreenStyles } from '@/components/lifeflow-screen';
import { ProfileAction } from '@/components/profile-fields';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync().catch(() => {});
function hideSplash() { void SplashScreen.hideAsync().catch(() => {}); }

function Routes() {
  const { session } = useAuth();
  const previousUserRef = useRef<string | null | undefined>(undefined);
  const userId = session?.user.id ?? null;
  return <ProfileProvider key={userId ?? 'guest'} userId={userId}><ProfileRoutes previousUserRef={previousUserRef} /></ProfileProvider>;
}
function ProfileRoutes({ previousUserRef }: { previousUserRef: RefObject<string | null | undefined> }) {
  const { colors } = useAppTheme();
  const screenStyles = useThemedStyles(baseScreenStyles);
  const { session, loading, signOut } = useAuth();
  const { profile, loading: profileLoading, error, reload } = useProfile();
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const userId = session?.user.id ?? null;
  const waiting = loading || (!!session && profileLoading);
  const complete = !!profile?.onboarding_completed_at;
  useEffect(() => {
    if (waiting || (userId && !profile)) return;
    const previous = previousUserRef.current;
    previousUserRef.current = userId;
    if (!userId) return;
    if (!complete) { if (pathname !== '/onboarding') router.replace('/onboarding'); }
    else if ((previous !== undefined && previous !== userId) || pathname === '/onboarding') router.replace('/');
  }, [userId, waiting, complete, profile, pathname, previousUserRef]);
  if (waiting) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
    <ActivityIndicator color={colors.teal} /><Text style={{ color: colors.muted }}>{loading ? 'Checking your session…' : 'Loading your profile…'}</Text>
  </View>;
  if (session && !profile) return <LifeFlowScreen title="Your profile" eyebrow="SETUP NEEDS ATTENTION" subtitle="Your saved tasks and habits are unchanged.">
    <View style={screenStyles.card}><Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: 16 }}>{error ?? 'Unable to load your profile.'}</Text>
      <ProfileAction label="Retry" onPress={() => { void reload(); }} />
      <ProfileAction label="Log out" onPress={() => { setLogoutError(null); void signOut().catch(() => setLogoutError('Could not log out. Please try again.')); }} />
      {logoutError && <Text accessibilityRole="alert" style={{ color: colors.error }}>{logoutError}</Text>}
    </View>
  </LifeFlowScreen>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
    <Stack.Protected guard={!!session && complete}><Stack.Screen name="(app)" /></Stack.Protected>
    <Stack.Protected guard={!!session && !complete}><Stack.Screen name="onboarding" /></Stack.Protected>
    <Stack.Screen name="welcome" />
    <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
  </Stack>;
}
function ThemedRoot() {
  const { mode, colors } = useAppTheme();
  const navigationTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  return <ThemeProvider value={{ ...navigationTheme, colors: { ...navigationTheme.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.teal } }}><AuthProvider>
    <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
    {/* Hide the native splash on layout. No animation overlay can obscure the screens. */}
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={hideSplash}><Routes /></View>
  </AuthProvider></ThemeProvider>;
}

export default function RootLayout() { return <AppThemeProvider><ThemedRoot /></AppThemeProvider>; }

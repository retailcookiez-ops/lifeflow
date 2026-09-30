import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppNavigation from '@/components/app-navigation';
import { LifeFlowProvider } from '@/providers/lifeflow-provider';

void SplashScreen.preventAutoHideAsync().catch(() => {});
export default function RootLayout() {
  return <ThemeProvider value={DarkTheme}>
    <LifeFlowProvider>
      <StatusBar barStyle="light-content" />
      <AnimatedSplashOverlay />
      <AppNavigation />
    </LifeFlowProvider>
  </ThemeProvider>;
}

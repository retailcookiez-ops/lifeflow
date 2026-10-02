import { useAppTheme } from '@/providers/theme-provider';
import { Stack } from 'expo-router';
export default function AuthLayout() {
  const { color } = useAppTheme();
  return <Stack initialRouteName="login" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color('#0C1015') } }} />;
}

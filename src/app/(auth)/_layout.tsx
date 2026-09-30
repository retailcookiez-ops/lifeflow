import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack initialRouteName="login" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0C1015' } }} />;
}

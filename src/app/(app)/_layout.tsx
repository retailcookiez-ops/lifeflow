import AppNavigation from '@/components/app-navigation';
import { LifeFlowProvider } from '@/providers/lifeflow-provider';
import { useAuth } from '@/providers/auth-provider';
export default function AppLayout() {
  const { session } = useAuth();
  if (!session) return null;
  return <LifeFlowProvider key={session.user.id} userId={session.user.id}><AppNavigation /></LifeFlowProvider>;
}

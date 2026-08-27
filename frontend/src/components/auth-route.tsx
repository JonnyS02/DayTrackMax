import type { Screen } from '../types';
import { useApp } from './app-context';
import { AuthScreens } from './auth-screens';

type AuthScreen = Exclude<Screen, 'dashboard' | 'profile'>;

export function AuthRoute({ screen }: { screen: AuthScreen }) {
  const { navigate, showToast } = useApp();
  return <AuthScreens screen={screen} onNavigate={navigate} showToast={showToast} />;
}

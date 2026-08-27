import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthRoute } from './components/auth-route';
import { useApp } from './components/app-context';
import { Dashboard } from './components/dashboard';
import { Profile } from './components/profile';
import { screenRoutes } from './routes';

function DashboardRoute() {
  const { navigate, showToast } = useApp();
  return <Dashboard onNavigate={navigate} showToast={showToast} />;
}

function ProfileRoute() {
  const { navigate, showToast } = useApp();
  return <Profile onNavigate={navigate} showToast={showToast} />;
}

export function App() {
  return (
    <Routes>
      <Route path={screenRoutes.dashboard} element={<DashboardRoute />} />
      <Route path={screenRoutes.login} element={<AuthRoute screen="login" />} />
      <Route path={screenRoutes.register} element={<AuthRoute screen="register" />} />
      <Route path={screenRoutes['verify-email']} element={<AuthRoute screen="verify-email" />} />
      <Route path={screenRoutes['forgot-password']} element={<AuthRoute screen="forgot-password" />} />
      <Route path={screenRoutes.locked} element={<AuthRoute screen="locked" />} />
      <Route path={screenRoutes['reset-password']} element={<AuthRoute screen="reset-password" />} />
      <Route path={screenRoutes.profile} element={<ProfileRoute />} />
      <Route path="*" element={<Navigate to={screenRoutes.dashboard} replace />} />
    </Routes>
  );
}

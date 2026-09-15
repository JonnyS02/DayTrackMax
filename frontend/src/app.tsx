import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthScreens } from './components/auth-screens';
import { Dashboard } from './components/dashboard';
import { Profile } from './components/profile';
import { screenRoutes } from './routes';

export function App() {
  return (
    <Routes>
      <Route path={screenRoutes.dashboard} element={<Dashboard />} />
      <Route path={screenRoutes.login} element={<AuthScreens screen="login" />} />
      <Route path={screenRoutes.register} element={<AuthScreens screen="register" />} />
      <Route path={screenRoutes['verify-email']} element={<AuthScreens screen="verify-email" />} />
      <Route path={screenRoutes['forgot-password']} element={<AuthScreens screen="forgot-password" />} />
      <Route path={screenRoutes.locked} element={<AuthScreens screen="locked" />} />
      <Route path={screenRoutes['reset-password']} element={<AuthScreens screen="reset-password" />} />
      <Route path={screenRoutes.profile} element={<Profile />} />
      <Route path="*" element={<Navigate to={screenRoutes.dashboard} replace />} />
    </Routes>
  );
}

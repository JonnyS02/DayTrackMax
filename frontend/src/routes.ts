import type { Screen } from './types';

export const screenRoutes: Record<Screen, string> = {
  dashboard: '/',
  login: '/login',
  'test-login': '/test-login',
  register: '/register',
  'verify-email': '/verify-email',
  'forgot-password': '/forgot-password',
  locked: '/locked',
  'reset-password': '/reset-password',
  profile: '/profile',
};

import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { screenRoutes } from '../routes';
import type { Screen } from '../types';
import { AppContext } from './app-context';
import { Toast } from './ui';

export function AppProvider({ children }: { children: ReactNode }) {
  const route = useNavigate();
  const [toast, setToast] = useState('');

  const navigate = useCallback((nextScreen: Screen) => {
    route(screenRoutes[nextScreen]);
  }, [route]);

  const showToast = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const value = useMemo(() => ({ navigate, showToast }), [navigate, showToast]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </AppContext.Provider>
  );
}

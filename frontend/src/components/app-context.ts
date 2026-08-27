import { createContext, useContext } from 'react';
import type { Screen } from '../types';

type AppContextValue = {
  navigate: (screen: Screen) => void;
  showToast: (message: string) => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider.');
  return context;
}

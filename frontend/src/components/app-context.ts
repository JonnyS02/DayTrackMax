import { createContext, useContext } from 'react';
import type { Locale } from '../i18n/locale';
import type { Translations } from '../i18n/translations';
import type { Screen } from '../types';

type AppContextValue = {
  navigate: (screen: Screen) => void;
  showToast: (message: string) => void;
  locale: Locale;
  isSavingLocale: boolean;
  copy: Translations;
  selectLocale: (locale: Locale) => Promise<void>;
  syncUserLocale: (locale: Locale) => void;
  clearUserLocale: () => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider.');
  return context;
}

import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { applyLocale, resolveInitialLocale } from '../i18n/locale';
import type { Locale } from '../i18n/locale';
import { translations } from '../i18n/translations';
import { screenRoutes } from '../routes';
import type { Screen } from '../types';
import { AppContext } from './app-context';
import { Toast } from './ui';

export function AppProvider({ children }: { children: ReactNode }) {
  const route = useNavigate();
  const [toast, setToast] = useState('');
  const [locale, setLocale] = useState<Locale>(resolveInitialLocale);
  const [isSavingLocale, setIsSavingLocale] = useState(false);
  const hasAuthenticatedUser = useRef(false);
  const pendingLocaleSave = useRef<Promise<void> | null>(null);

  const navigate = useCallback((nextScreen: Screen) => {
    route(screenRoutes[nextScreen]);
  }, [route]);

  const showToast = useCallback((message: string) => setToast(message), []);

  const syncUserLocale = useCallback((userLocale: Locale) => {
    // Keep the user's language choice when another profile response arrives.
    if (hasAuthenticatedUser.current) return;
    hasAuthenticatedUser.current = true;
    setLocale(userLocale);
  }, []);

  const clearUserLocale = useCallback(() => {
    hasAuthenticatedUser.current = false;
    pendingLocaleSave.current = null;
    setIsSavingLocale(false);
  }, []);

  const selectLocale = useCallback(async (nextLocale: Locale) => {
    if (pendingLocaleSave.current || nextLocale === locale) return;

    if (!hasAuthenticatedUser.current) {
      setLocale(nextLocale);
      return;
    }

    const request = api.updateLocale(nextLocale);
    pendingLocaleSave.current = request;
    setIsSavingLocale(true);
    try {
      await request;
      if (pendingLocaleSave.current !== request) return;
      setLocale(nextLocale);
    } catch (error) {
      if (pendingLocaleSave.current !== request) return;
      if (error instanceof ApiError && error.status === 401) {
        clearUserLocale();
        navigate('login');
      } else {
        showToast(translations[locale].common.languageSaveFailed);
      }
    } finally {
      if (pendingLocaleSave.current === request) {
        pendingLocaleSave.current = null;
        setIsSavingLocale(false);
      }
    }
  }, [clearUserLocale, locale, navigate, showToast]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    applyLocale(locale);
    const description = translations[locale].metaDescription;
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      const meta = document.querySelector<HTMLMetaElement>(selector);
      if (meta) meta.content = description;
    }
  }, [locale]);

  const value = useMemo(() => ({
    navigate,
    showToast,
    locale,
    isSavingLocale,
    copy: translations[locale],
    selectLocale,
    syncUserLocale,
    clearUserLocale,
  }), [clearUserLocale, isSavingLocale, locale, navigate, selectLocale, showToast, syncUserLocale]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </AppContext.Provider>
  );
}
